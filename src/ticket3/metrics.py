import json
from datetime import datetime, timedelta, timezone
from collections import Counter

# ==============================================================================
# --- SCRIPT CONFIGURATION (EDIT THIS SECTION FOR FUTURE REPORTS) ---
# ==============================================================================

JSON_FILE_PATH = "p_msde_szr.workspaces_2.json"
TOP_N_EONIDS = 5  # How many most frequent eonids to display

# 1. Define all time periods you want to analyze here.
#    Use a descriptive key (e.g., 'H1 2025') and 'YYYY-MM-DD' format for dates.
PERIODS = {
    'Full Year 2024': {
        'start_date': '2024-01-01',
        'end_date':   '2024-12-31'
    },
    'H1 2025': { # Jan-June 2025
        'start_date': '2025-01-01',
        'end_date':   '2025-06-30'
    },
    'H2 2025': { # July-Dec 2025
        'start_date': '2025-07-01',
        'end_date':   '2025-12-31'
    },
    'Full Year 2025': {
        'start_date': '2025-01-01',
        'end_date':   '2025-12-31'
    }
}

# 2. Set the key of the period that will be used as the baseline for all comparisons.
BASELINE_PERIOD_KEY = 'Full Year 2024'

# ==============================================================================
# --- END OF CONFIGURATION ---
# ==============================================================================

def parse_iso_datetime(date_str):
    if not date_str: return None
    if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
    try: return datetime.fromisoformat(date_str)
    except ValueError:
        try: return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
        except ValueError:
            try: return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S+00:00')
            except ValueError: return None

def get_comparison_text(current_val, previous_val, item_name="items"):
    if previous_val == 0:
        if current_val > 0: return f"Increased from 0 to {current_val} (previously no {item_name})."
        else: return f"Remained at 0 {item_name}."
    if current_val > previous_val:
        diff = current_val - previous_val
        percentage_increase = (diff / previous_val) * 100
        return f"Increased by {diff} ({percentage_increase:+.2f}%) from {previous_val}."
    elif current_val < previous_val:
        diff = previous_val - current_val
        percentage_decrease = (diff / previous_val) * 100
        return f"Decreased by {diff} (-{percentage_decrease:.2f}%) from {previous_val}."
    else:
        return f"Remained the same at {current_val}."

def analyze_workspace_data(file_path, periods_config, baseline_key):
    # --- Step 1: Initialize data structures ---
    
    # Parse date strings from config into datetime objects for comparison
    for key, period in periods_config.items():
        period['start'] = datetime.fromisoformat(period['start_date']).replace(tzinfo=timezone.utc)
        period['end'] = datetime.fromisoformat(period['end_date']).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        period['start_minus_one_day'] = period['start'] - timedelta(days=1)

    # Dictionary to hold the final calculated results for each period
    period_results = {key: {
        'newly_created': 0,
        'active_in_period': 0, # Created in period AND not archived
        'archived_in_period': 0, # Created in period AND archived
        'eonid_counts': Counter(),
        'cumulative_active_at_start': 0,
        'cumulative_active_at_end': 0,
    } for key in periods_config}

    all_workspace_ids = set()
    total_processed_entries = 0
    # ... other error/summary counters ...
    
    try:
        # --- Step 2: Read and process the JSON file ---
        with open(file_path, 'r', encoding='utf-8') as f:
            # This part for reading JSON array or JSON Lines is the same
            try: data_objects = json.load(f)
            except json.JSONDecodeError:
                f.seek(0)
                data_objects = [json.loads(line) for line in f if line.strip()]

        total_processed_entries = len(data_objects)

        for ws in data_objects:
            created_at_date = parse_iso_datetime(ws.get("createdAt", {}).get("$date"))
            if not created_at_date: continue

            is_archived = ws.get("archived") is True
            all_workspace_ids.add(str(ws.get("workspaceId", "Unknown")))

            # Calculate metrics for each defined period
            for key, period in periods_config.items():
                # A) Cumulative counts (total active workspaces up to a point in time)
                if created_at_date <= period['start_minus_one_day'] and not is_archived:
                    period_results[key]['cumulative_active_at_start'] += 1
                if created_at_date <= period['end'] and not is_archived:
                    period_results[key]['cumulative_active_at_end'] += 1

                # B) Period-specific counts (for workspaces CREATED within the period)
                if period['start'] <= created_at_date <= period['end']:
                    period_results[key]['newly_created'] += 1
                    current_eonid = str(ws.get("eonid", "Unknown"))
                    period_results[key]['eonid_counts'][current_eonid] += 1
                    
                    if is_archived:
                        period_results[key]['archived_in_period'] += 1
                    else:
                        period_results[key]['active_in_period'] += 1

        # --- Step 3: Print the dynamic report ---
        print("\n" + "="*80)
        print(" " * 25 + "WORKSPACE METRICS REPORT")
        print("="*80)

        baseline_results = period_results[baseline_key]
        print(f"\n--- BASELINE PERIOD: {baseline_key} ({periods_config[baseline_key]['start_date']} to {periods_config[baseline_key]['end_date']}) ---\n")
        print(f"1. Active Workspaces Created in Period: {baseline_results['active_in_period']}")
        print(f"2. Cumulative Active Workspaces at End of Period: {baseline_results['cumulative_active_at_end']}")
        print(f"3. Net Change in Active Workspaces During Period: {(baseline_results['cumulative_active_at_end'] - baseline_results['cumulative_active_at_start']):+}")
        print(f"4. Newly Created Workspaces (Total): {baseline_results['newly_created']}")
        print(f"5. Unique `eonid`s in Period: {len(baseline_results['eonid_counts'])}")

        # Loop through all other periods and compare them to the baseline
        for key, results in period_results.items():
            if key == baseline_key: continue

            print("\n" + "-"*80)
            print(f"\n--- COMPARISON PERIOD: {key} ({periods_config[key]['start_date']} to {periods_config[key]['end_date']}) ---\n")
            
            # Metric 1: Active Workspaces created in Period
            print(f"1. Active Workspaces Created in Period: {results['active_in_period']}")
            print(f"   - Comparison to Baseline: {get_comparison_text(results['active_in_period'], baseline_results['active_in_period'])}")

            # Metric 2: Cumulative Active Workspaces
            print(f"\n2. Cumulative Active Workspaces at End of Period: {results['cumulative_active_at_end']}")
            print(f"   - Comparison to Baseline: {get_comparison_text(results['cumulative_active_at_end'], baseline_results['cumulative_active_at_end'])}")

            # Metric 3: Net Change
            net_change = results['cumulative_active_at_end'] - results['cumulative_active_at_start']
            baseline_net_change = baseline_results['cumulative_active_at_end'] - baseline_results['cumulative_active_at_start']
            print(f"\n3. Net Change in Active Workspaces During Period: {net_change:+}")
            print(f"   - Comparison to Baseline: {get_comparison_text(net_change, baseline_net_change)}")
            
            # Metric 4: Newly Created (Total)
            print(f"\n4. Newly Created Workspaces (Total): {results['newly_created']}")
            print(f"   - Comparison to Baseline: {get_comparison_text(results['newly_created'], baseline_results['newly_created'])}")

            # Metric 5: eonid Analysis
            print(f"\n5. Unique `eonid`s in Period: {len(results['eonid_counts'])}")
            print(f"   - Comparison to Baseline: {get_comparison_text(len(results['eonid_counts']), len(baseline_results['eonid_counts']))}")
            print(f"   Most Frequent `eonid`s (Top {TOP_N_EONIDS}):")
            if results['eonid_counts']:
                for eonid, count in results['eonid_counts'].most_common(TOP_N_EONIDS): print(f"     - {eonid}: {count} occurrences")
            else:
                print("     - No eonids found for this period.")

        print("\n" + "="*80)
        print(f"Total Unique Workspaces (Overall): {len(all_workspace_ids)}")
        print(f"Total Raw Entries Processed: {total_processed_entries}")
        print("="*80)

    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_workspace_data(JSON_FILE_PATH, PERIODS, BASELINE_PERIOD_KEY)