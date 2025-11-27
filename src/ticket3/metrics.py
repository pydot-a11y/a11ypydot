#!/usr/bin/env python3

"""
STRUCTURIZR WORKSPACE METRICS ANALYSIS
--------------------------------------

This script handles both JSON formats:

1) With createdAt.$date
2) Without createdAt — in this case the timestamp is derived from _id.$oid

Time periods are configured at the top and can be changed anytime.

Output metrics per period:
- cumulative_active_end
- active_created_in_period
- net_change
- pct_growth_vs_baseline

Run:
    python workspace_growth_metrics.py <filename.json>
"""

import json
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

# ========================= CONFIG ========================= #

PERIODS: Dict[str, Tuple[str, str]] = {
    "2024_FULL": ("2024-01-01", "2024-12-31"),
    "2025_H1"  : ("2025-01-01", "2025-06-30"),
    "2025_H2"  : ("2025-07-01", "2025-12-31"),
    "2025_FULL": ("2025-01-01", "2025-12-31"),
}

BASELINE_PERIOD_KEY = "2024_FULL"


# ========================= DATE PARSERS ========================= #

def parse_iso_datetime(value: str) -> datetime:
    """Convert ISO + Z format to datetime."""
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


def created_from_oid(oid_str: str) -> datetime:
    """Extract datetime from the first 8 characters of a Mongo ObjectID."""
    ts = int(oid_str[:8], 16)  # timestamp in hex → seconds
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def get_effective_created_at(doc: Dict[str, Any]) -> datetime | None:
    """
    Get workspace creation timestamp:
     1) If createdAt.$date exists → use it
     2) Otherwise derive from ObjectId
    """

    # --- Try explicit createdAt first ---
    raw = doc.get("createdAt")
    if isinstance(raw, dict):  # { "$date": "..." }
        raw = raw.get("$date")

    if isinstance(raw, str):
        try:
            return parse_iso_datetime(raw)
        except Exception:
            pass  # fallback to ObjectId

    # --- Fallback: derive from ObjectId ---
    oid = None
    _id = doc.get("_id")

    if isinstance(_id, dict): oid = _id.get("$oid")
    elif isinstance(_id, str): oid = _id

    if oid and len(oid) >= 8:
        try: return created_from_oid(oid)
        except: return None

    return None


# ========================= METRIC ENGINE ========================= #

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def prepare_records(data: list) -> list:
    records = []
    for doc in data:
        ts = get_effective_created_at(doc)
        if ts:
            records.append({
                "created_at": ts,
                "archived"  : bool(doc.get("archived", False))
            })
    return sorted(records, key=lambda x: x["created_at"])


def build_periods():
    b = {}
    for k,(s,e) in PERIODS.items():
        b[k] = {
            "start": datetime.fromisoformat(s+"T00:00:00+00:00"),
            "end"  : datetime.fromisoformat(e+"T23:59:59+00:00")
        }
    return b


def cumulative(records, end_date):
    return sum(1 for r in records if r["created_at"] <= end_date and not r["archived"])


def created_in(records, start, end):
    return sum(1 for r in records if start <= r["created_at"] <= end and not r["archived"])


def analyze(records):
    periods = build_periods()
    base_end = periods[BASELINE_PERIOD_KEY]["end"]
    base_count = cumulative(records, base_end)

    results = {}

    for key,(start,end) in PERIODS.items():
        ps = periods[key]["start"]
        pe = periods[key]["end"]

        ce = cumulative(records, pe)
        cp = created_in(records, ps, pe)

        pct = ((ce - base_count) / base_count * 100) if base_count>0 else None

        results[key] = {
            "cumulative_active_end": ce,
            "active_created_in_period": cp,
            "net_change": cp,  # no archivedAt → equal to new creations
            "pct_growth_vs_baseline": pct
        }

    return results


def print_table(res):
    h = f"{'Period':<12} {'Active End':>12} {'Created':>12} {'Net':>10} {'% Growth vs 2024':>18}"
    print(h)
    print("-" * len(h))
    for k in PERIODS:
        r = res[k]
        pct = f"{r['pct_growth_vs_baseline']:.1f}%" if r['pct_growth_vs_baseline']!=None else "N/A"
        print(f"{k:<12} {r['cumulative_active_end']:>12} {r['active_created_in_period']:>12} {r['net_change']:>10} {pct:>18}")


# ========================= MAIN ========================= #

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv)>1 else "workspaces.json"
    raw = load_json(path)
    records = prepare_records(raw)
    results = analyze(records)
    print_table(results)