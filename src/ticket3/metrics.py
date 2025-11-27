#!/usr/bin/env python3
"""
Workspace growth analysis.

- Reads a JSON file containing an array of workspace documents.
- Each workspace has at least:
    {
      "_id": "...",
      "createdAt": { "$date": "2024-10-15T00:00:00Z" }  # or a plain ISO string
      "archived": false
    }

Metrics per configured period:
- cumulative_active_end: total non-archived workspaces created on or before period.end
- active_created_in_period: non-archived workspaces created within [start, end]
- net_change: same as active_created_in_period (no archivedAt, so we can't model deletions)
- pct_growth_vs_baseline: percentage growth in cumulative_active_end vs baseline period.
"""

import json
import sys
from datetime import datetime
from typing import Any, Dict, List, Tuple

# ================== CONFIG ==================

# Path to JSON file (array of workspace docs)
JSON_FILE_PATH = "workspaces.json"

# Periods to analyze: key -> (start_date, end_date) as YYYY-MM-DD
PERIODS: Dict[str, Tuple[str, str]] = {
    "2024_FULL": ("2024-01-01", "2024-12-31"),
    "2025_H1":   ("2025-01-01", "2025-06-30"),
    "2025_H2":   ("2025-07-01", "2025-12-31"),
    "2025_FULL": ("2025-01-01", "2025-12-31"),
}

# Baseline period key for growth calculations
BASELINE_PERIOD_KEY = "2024_FULL"

# ================== HELPERS ==================

def parse_iso_datetime(value: str) -> datetime:
    """
    Parse an ISO datetime string that may end with 'Z' into a timezone-aware datetime.
    """
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def parse_created_at(doc: Dict[str, Any]) -> datetime | None:
    """
    Extract and parse createdAt from a workspace doc.
    Handles:
        "createdAt": {"$date": "..."}
        "createdAt": "..."
    """
    raw = doc.get("createdAt")
    if isinstance(raw, dict):
        raw = raw.get("$date")
    if not isinstance(raw, str):
        return None
    try:
        return parse_iso_datetime(raw)
    except Exception:
        return None


def build_period_bounds() -> Dict[str, Dict[str, datetime]]:
    """
    Turn PERIODS (date strings) into datetime bounds with full-day coverage.
    """
    bounds: Dict[str, Dict[str, datetime]] = {}
    for key, (start_str, end_str) in PERIODS.items():
        start_dt = datetime.fromisoformat(start_str + "T00:00:00+00:00")
        end_dt = datetime.fromisoformat(end_str + "T23:59:59+00:00")
        bounds[key] = {"start": start_dt, "end": end_dt}
    return bounds


def cumulative_active_as_of(records: List[Dict[str, Any]], end_dt: datetime) -> int:
    """
    Count non-archived workspaces created on or before end_dt.
    """
    return sum(
        1
        for r in records
        if r["created_at"] is not None
        and r["created_at"] <= end_dt
        and not r["archived"]
    )


def active_created_in_period(
    records: List[Dict[str, Any]], start_dt: datetime, end_dt: datetime
) -> int:
    """
    Count non-archived workspaces created within [start_dt, end_dt].
    """
    return sum(
        1
        for r in records
        if r["created_at"] is not None
        and start_dt <= r["created_at"] <= end_dt
        and not r["archived"]
    )


# ================== MAIN ANALYSIS ==================

def load_workspaces(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def prepare_records(raw_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize records to a simple list of {created_at: datetime, archived: bool}.
    """
    records: List[Dict[str, Any]] = []
    for doc in raw_docs:
        dt = parse_created_at(doc)
        archived = bool(doc.get("archived", False))
        if dt is not None:
            records.append(
                {
                    "created_at": dt,
                    "archived": archived,
                }
            )
    records.sort(key=lambda r: r["created_at"])
    return records


def analyze(records: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    period_bounds = build_period_bounds()

    if BASELINE_PERIOD_KEY not in period_bounds:
        raise ValueError(f"Baseline period '{BASELINE_PERIOD_KEY}' is not defined in PERIODS.")

    baseline_end = period_bounds[BASELINE_PERIOD_KEY]["end"]
    baseline_cum = cumulative_active_as_of(records, baseline_end)

    results: Dict[str, Dict[str, Any]] = {}

    for key in PERIODS.keys():  # keep original order
        start_dt = period_bounds[key]["start"]
        end_dt = period_bounds[key]["end"]

        cumulative_end = cumulative_active_as_of(records, end_dt)
        created_in_period = active_created_in_period(records, start_dt, end_dt)
        net_change = created_in_period  # no archivedAt, so only creations we can see

        pct_growth = None
        if baseline_cum > 0:
            pct_growth = ((cumulative_end - baseline_cum) / baseline_cum) * 100.0

        results[key] = {
            "period": key,
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
            "cumulative_active_end": cumulative_end,
            "active_created_in_period": created_in_period,
            "net_change": net_change,
            "pct_growth_vs_baseline": pct_growth,
        }

    return results


def print_results(results: Dict[str, Dict[str, Any]]) -> None:
    """
    Pretty-print results in a simple table.
    """
    header = (
        f"{'Period':<10}  {'Active @ End':>12}  "
        f"{'Created in Period':>17}  {'Net Change':>11}  {'% Growth vs 2024':>17}"
    )
    print(header)
    print("-" * len(header))

    for key in PERIODS.keys():
        r = results[key]
        pct = r["pct_growth_vs_baseline"]
        pct_str = f"{pct:,.1f}%" if pct is not None else "N/A"
        print(
            f"{key:<10}  "
            f"{r['cumulative_active_end']:>12}  "
            f"{r['active_created_in_period']:>17}  "
            f"{r['net_change']:>11}  "
            f"{pct_str:>17}"
        )


def main() -> None:
    path = JSON_FILE_PATH
    if len(sys.argv) > 1:
        path = sys.argv[1]

    raw_docs = load_workspaces(path)
    records = prepare_records(raw_docs)
    results = analyze(records)
    print_results(results)


if __name__ == "__main__":
    main()