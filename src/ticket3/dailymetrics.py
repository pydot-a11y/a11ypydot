#!/usr/bin/env python3

"""
Daily workspace metrics.

Outputs two CSV files:

1) daily_created.csv
   - date, created_count

2) daily_active.csv
   - date, cumulative_active
     (only workspaces where archived == false, counted cumulatively)

Creation time is taken from:
- createdAt.$date (if present), else
- ObjectId timestamp from _id.$oid
"""

import json
import sys
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

# ---------- CONFIG ---------- #

# Default input file (can be overridden via CLI)
DEFAULT_JSON_PATH = "workspaces.json"

OUTPUT_CREATED_CSV = "daily_created.csv"
OUTPUT_ACTIVE_CSV = "daily_active.csv"

# Optional hard bounds (YYYY-MM-DD). Set to None to auto-detect from data.
DATE_RANGE_START: Optional[str] = None
DATE_RANGE_END: Optional[str] = None


# ---------- HELPERS: DATE PARSING ---------- #

def parse_iso_datetime(value: str) -> datetime:
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def created_from_oid(oid_str: str) -> datetime:
    """Extract datetime from first 8 hex chars of a Mongo ObjectId."""
    ts = int(oid_str[:8], 16)
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def get_effective_created_at(doc: Dict[str, Any]) -> Optional[datetime]:
    """
    1) Try createdAt.$date or createdAt string
    2) Fallback to _id.$oid timestamp
    """
    # 1) createdAt
    raw = doc.get("createdAt")
    if isinstance(raw, dict):
        raw = raw.get("$date")

    if isinstance(raw, str):
        try:
            return parse_iso_datetime(raw)
        except Exception:
            pass

    # 2) _id.$oid
    oid = None
    _id = doc.get("_id")
    if isinstance(_id, dict):
        oid = _id.get("$oid")
    elif isinstance(_id, str):
        oid = _id

    if isinstance(oid, str) and len(oid) >= 8:
        try:
            return created_from_oid(oid)
        except Exception:
            return None

    return None


# ---------- CORE LOGIC ---------- #

def load_workspaces(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def prepare_records(raw_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize to: { created_at: datetime, archived: bool }
    """
    records: List[Dict[str, Any]] = []
    for doc in raw_docs:
        ts = get_effective_created_at(doc)
        if ts is None:
            continue
        records.append(
            {
                "created_at": ts,
                "archived": bool(doc.get("archived", False)),
            }
        )
    records.sort(key=lambda r: r["created_at"])
    return records


def determine_date_range(records: List[Dict[str, Any]]) -> (datetime, datetime):
    if not records:
        raise ValueError("No valid records found.")

    if DATE_RANGE_START:
        start = datetime.fromisoformat(DATE_RANGE_START + "T00:00:00+00:00")
    else:
        start = min(r["created_at"] for r in records)
        start = datetime.combine(start.date(), datetime.min.time(), tzinfo=start.tzinfo)

    if DATE_RANGE_END:
        end = datetime.fromisoformat(DATE_RANGE_END + "T23:59:59+00:00")
    else:
        end = max(r["created_at"] for r in records)
        end = datetime.combine(end.date(), datetime.max.time(), tzinfo=end.tzinfo)

    return start, end


def build_daily_metrics(records: List[Dict[str, Any]]):
    # Count creations per day (all workspaces)
    created_counts: Dict[datetime.date, int] = {}
    # Count creations per day for active (non-archived) only
    active_created_counts: Dict[datetime.date, int] = {}

    for r in records:
        day = r["created_at"].date()
        created_counts[day] = created_counts.get(day, 0) + 1
        if not r["archived"]:
            active_created_counts[day] = active_created_counts.get(day, 0) + 1

    start_dt, end_dt = determine_date_range(records)

    # Build full day-by-day list
    days = []
    current = start_dt.date()
    end_date = end_dt.date()
    while current <= end_date:
        days.append(current)
        current = current + timedelta(days=1)

    # Daily created (all)
    daily_created_rows = []
    for d in days:
        daily_created_rows.append(
            (d.isoformat(), created_counts.get(d, 0))
        )

    # Daily cumulative active (non-archived)
    daily_active_rows = []
    cumulative_active = 0
    for d in days:
        # Add any newly created active workspaces for this day
        cumulative_active += active_created_counts.get(d, 0)
        daily_active_rows.append(
            (d.isoformat(), cumulative_active)
        )

    return daily_created_rows, daily_active_rows


def write_csv(path: str, header: List[str], rows: List[tuple]) -> None:
    import csv

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for row in rows:
            writer.writerow(row)


def main():
    # --- input path ---
    json_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSON_PATH

    raw_docs = load_workspaces(json_path)
    records = prepare_records(raw_docs)

    daily_created_rows, daily_active_rows = build_daily_metrics(records)

    write_csv(OUTPUT_CREATED_CSV, ["date", "created_count"], daily_created_rows)
    write_csv(OUTPUT_ACTIVE_CSV, ["date", "cumulative_active"], daily_active_rows)

    print(f"Wrote {OUTPUT_CREATED_CSV} and {OUTPUT_ACTIVE_CSV}")


if __name__ == "__main__":
    main()