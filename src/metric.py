import json
from datetime import datetime, timedelta, timezone
from collections import Counter # For eonid frequency

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json"
TOP_N_EONIDS = 5 # How many most frequent eonids to display

# Define the specific time periods
# Period 1 (Current Period): Jan 2025 - June 2025
P1_START_STR = "2025-01-01"
P1_END_STR = "2025-06-30"
P1_START = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
P1_END = datetime(2025, 6, 30, 23, 59, 59, 999999, tzinfo=timezone.utc)

# Period 2 (Previous Period): July 2024 - Dec 2024
P2_START_STR = "2024-07-01"
P2_END_STR = "2024-12-31"
P2_START = datetime(2024, 7, 1, 0, 0, 0, tzinfo=timezone.utc)
P2_END = datetime(2024, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)
# --- End Configuration ---

def parse_iso_datetime(date_str):
    if not date_str:
        return None
    if date_str.endswith('Z'):
        date_str = date_str[:-1] + '+00:00'
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        try:
            return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
        except ValueError:
            try:
                return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S+00:00')
            except ValueError:
                # print(f"Warning: Could not parse date string: {date_str}") # Optional: more verbose logging
                return None

def get_comparison_text(current_val, previous_val, item_name="items"):
    if previous_val == 0:
        if current_val > 0:
            return f"Increased from 0 to {current_val} (previously no {item_name})."
        elif current_val == 0 and item_name == "items": # Generic case
             return f"Remained at 0."
        else: # current_val == 0 and specific item_name
            return f"Remained at 0 {item_name}."

    if current_val > previous_val:
        diff = current_val - previous_val
        percentage_increase = (diff / previous_val) * 100
        return f"Increased by {diff} ({percentage_increase:+.2f}%) from {previous_val}."
    elif current_val < previous_val:
        diff = previous_val - current_val
        percentage_decrease = (diff / previous_val) * 100 # This will be positive
        return f"Decreased by {diff} (-{percentage_decrease:.2f}%) from {previous_val}."
    else:
        return f"Remained the same at {current_val}."

def analyze_workspace_data(file_path):
    all_workspace_ids = set()
    
    created_p1_count = 0
    created_p2_count = 0
    
    archived_created_p1_count = 0 
    archived_created_p2_count = 0

    eonids_p1 = Counter()
    eonids_p2 = Counter()
    
    instance_counts = Counter()
    read_role_counts = Counter()
    write_role_counts = Counter()
    
    processed_entries = 0
    missing_created_at_count = 0
    date_parse_errors_count = 0
    json_line_parse_errors = 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data_objects = json.load(f)
                if not isinstance(data_objects, list):
                    data_objects = [data_objects]
            except json.JSONDecodeError:
                f.seek(0)
                data_objects = []
                for line_number, line in enumerate(f, 1):
                    line = line.strip()
                    if line:
                        try:
                            data_objects.append(json.loads(line))
                        except json.JSONDecodeError as e_line:
                            # print(f"Warning: Skipping invalid JSON on line {line_number}: {e_line}")
                            json_line_parse_errors += 1
        
        if not data_objects and json_line_parse_errors == 0 and processed_entries == 0 :
            print("No data objects found or successfully parsed from the file.")
            return

        processed_entries = len(data_objects)

        for ws in data_objects:
            workspace_id = ws.get("workspaceId")
            if workspace_id is not None:
                all_workspace_ids.add(str(workspace_id))

            instance_counts[ws.get("instance", "Unknown")] += 1
            read_role_counts[ws.get("readRole", "Unknown")] += 1
            write_role_counts[ws.get("writeRole", "Unknown")] += 1

            current_eonid = ws.get("eonid") # Can be number or string, or None
            if current_eonid is not None:
                current_eonid = str(current_eonid) # Standardize to string for Counter keys
            else:
                current_eonid = "Unknown"


            created_at_str = ws.get("createdAt", {}).get("$date")
            if not created_at_str:
                missing_created_at_count +=1
                continue 

            created_at_date = parse_iso_datetime(created_at_str)
            if not created_at_date:
                date_parse_errors_count +=1
                continue 

            is_archived = ws.get("archived") is True

            if P1_START <= created_at_date <= P1_END:
                created_p1_count += 1
                eonids_p1[current_eonid] += 1
                if is_archived:
                    archived_created_p1_count += 1
            
            elif P2_START <= created_at_date <= P2_END:
                created_p2_count += 1
                eonids_p2[current_eonid] += 1
                if is_archived:
                    archived_created_p2_count += 1
        
        total_unique_workspaces = len(all_workspace_ids)

        print("\n--- Workspace Metrics ---")
        print(f"Reporting for Period 1 (P1): {P1_START_STR} to {P1_END_STR}")
        print(f"Compared against Period 2 (P2): {P2_START_STR} to {P2_END_STR}")
        print("--------------------------------------------------")

        print(f"\n1. Total Unique Workspaces (overall, across all time in data): {total_unique_workspaces}")
        
        print(f"\n2. Newly Created Workspaces (workspaces with creation date in period):")
        print(f"   - P1 (Jan-June 2025): {created_p1_count}")
        print(f"   - P2 (July-Dec 2024): {created_p2_count}")
        comparison_created = get_comparison_text(created_p1_count, created_p2_count, "newly created workspaces")
        print(f"   - Comparison (P1 vs P2): {comparison_created}")

        print(f"\n3. Archived Workspaces:")
        print(f"   NOTE: This counts workspaces *created* within the specified period that are *currently* marked as 'archived'.")
        print(f"         It does NOT indicate that the archival action itself took place within this period (due to no 'archivedAt' timestamp).")
        print(f"   - P1 (Created Jan-June 2025 AND now archived): {archived_created_p1_count}")
        print(f"   - P2 (Created July-Dec 2024 AND now archived): {archived_created_p2_count}")
        comparison_archived = get_comparison_text(archived_created_p1_count, archived_created_p2_count, "archived workspaces (created in period)")
        print(f"   - Comparison (P1 vs P2): {comparison_archived}")

        print(f"\n4. `eonid` (Department/Entity ID) Analysis (for workspaces created in period):")
        unique_eonids_p1_count = len(eonids_p1)
        unique_eonids_p2_count = len(eonids_p2)
        
        print(f"   Unique `eonid`s associated with workspaces created in:")
        print(f"     - P1: {unique_eonids_p1_count}")
        print(f"     - P2: {unique_eonids_p2_count}")
        comparison_eonid_unique_count = get_comparison_text(unique_eonids_p1_count, unique_eonids_p2_count, "unique eonids")
        print(f"     - Comparison (P1 vs P2): {comparison_eonid_unique_count}")

        print(f"\n   Most Frequent `eonid`s for workspaces created in P1 (Top {TOP_N_EONIDS}):")
        if eonids_p1:
            for eonid, count in eonids_p1.most_common(TOP_N_EONIDS):
                print(f"     - {eonid}: {count} occurrences")
        else:
            print("     - No eonids found for P1.")

        print(f"\n   Most Frequent `eonid`s for workspaces created in P2 (Top {TOP_N_EONIDS}):")
        if eonids_p2:
            for eonid, count in eonids_p2.most_common(TOP_N_EONIDS):
                print(f"     - {eonid}: {count} occurrences")
        else:
            print("     - No eonids found for P2.")
        
        print("\n--- Other Data Insights (Overall Data) ---")
        print(f"- Total raw entries processed from file: {processed_entries}")
        if json_line_parse_errors > 0:
            print(f"- Lines skipped due to invalid JSON structure: {json_line_parse_errors}")
        if missing_created_at_count > 0:
            print(f"- Entries skipped due to missing 'createdAt.$date': {missing_created_at_count}")
        if date_parse_errors_count > 0:
            print(f"- Entries skipped due to 'createdAt.$date' parsing errors: {date_parse_errors_count}")
        
        print("\n- Distribution of Workspaces by 'instance' (Overall):")
        if instance_counts:
            for inst, count in instance_counts.most_common(): # Show all, sorted by freq
                print(f"  - {inst}: {count}")
        else:
            print("  - No instance data found or all were 'Unknown'.")

        print("\n- Distribution of 'readRole' (Overall):")
        if read_role_counts:
            for role, count in read_role_counts.most_common():
                print(f"  - {role}: {count}")
        else:
            print("  - No readRole data found.")

        print("\n- Distribution of 'writeRole' (Overall):")
        if write_role_counts:
            for role, count in write_role_counts.most_common():
                print(f"  - {role}: {count}")
        else:
            print("  - No writeRole data found.")
            
        print("\n--- Key Data Limitations (Reminder) ---")
        print("  - No 'updatedAt' field: Cannot determine workspace activity levels or when updates occurred.")
        print("  - No 'archivedAt' field: Cannot determine *when* a workspace was archived. 'Archived' metrics are based on workspaces *created* in a period that are *currently* archived.")
        print("  - Many originally requested metrics (line count, views, size, visualization type, node types, API/CLI usage) remain unavailable with this dataset.")

    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(f"Analyzing workspace data from: {JSON_FILE_PATH}")
    analyze_workspace_data(JSON_FILE_PATH)