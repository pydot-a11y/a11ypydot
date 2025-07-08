import json
from datetime import datetime, timezone

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json" # Make sure this points to p_msde_szr.workspaces_2.json for your run

# Define Key Dates
END_OF_PREVIOUS_YEAR_CUTOFF = datetime(2024, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)
START_OF_CURRENT_YEAR = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
CURRENT_SNAPSHOT_DATE_CUTOFF = datetime(2025, 6, 3, 23, 59, 59, 999999, tzinfo=timezone.utc) # End of June 3rd
# --- End Configuration ---

def parse_iso_datetime(date_str):
    if not date_str: return None
    if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
    try: return datetime.fromisoformat(date_str)
    except ValueError:
        try: return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
        except ValueError:
            try: return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S+00:00')
            except ValueError: return None

def get_hashable_workspace_id(ws_id_value):
    """
    Ensures the workspace ID is hashable (e.g., string or number).
    If it's a dict like {"$oid": "value"}, extracts "value".
    """
    if isinstance(ws_id_value, dict):
        # Attempt common patterns, e.g., MongoDB's $oid
        if "$oid" in ws_id_value:
            return str(ws_id_value["$oid"])
        # Add other patterns if your workspaceId dict has a different structure
        # For now, if it's a dict and not recognized, we might return a string representation
        # or raise an error, or return None. Returning None will skip it.
        # print(f"Warning: workspaceId is a dictionary with unrecognized structure: {ws_id_value}")
        return None # Or str(ws_id_value) if you want to try hashing the string form (less reliable for uniqueness)
    elif ws_id_value is not None:
        return str(ws_id_value) # Ensure it's a string if it's a number, etc.
    return None


def analyze_growth_metrics(file_path):
    active_ws_end_prev_year = 0
    active_ws_current_snapshot = 0
    
    new_ws_created_this_year_gross = 0
    new_ws_created_this_year_and_active = 0
    new_ws_created_this_year_and_archived = 0

    ids_active_at_start_of_year = set()
    ids_archived_by_snapshot_that_were_active_start_of_year = set()

    processed_entries = 0
    missing_created_at_count = 0
    date_parse_errors_count = 0
    json_line_parse_errors = 0
    unhashable_id_skips = 0


    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data_objects = json.load(f)
                if not isinstance(data_objects, list): data_objects = [data_objects]
            except json.JSONDecodeError:
                f.seek(0)
                data_objects = []
                for line_number, line in enumerate(f, 1): # Added line_number for better error reporting
                    line = line.strip()
                    if line:
                        try: 
                            data_objects.append(json.loads(line))
                        except json.JSONDecodeError as e_line: 
                            # print(f"Warning: Skipping invalid JSON on line {line_number}: {e_line}")
                            json_line_parse_errors += 1
        
        if not data_objects and not json_line_parse_errors:
            print("No data objects found.")
            return
        processed_entries = len(data_objects)

        for ws in data_objects:
            # --- MODIFICATION START ---
            raw_workspace_id_val = ws.get("workspaceId")
            hashable_workspace_id = get_hashable_workspace_id(raw_workspace_id_val)
            # --- MODIFICATION END ---
            
            created_at_str = ws.get("createdAt", {}).get("$date")
            if not created_at_str:
                missing_created_at_count += 1
                continue
            created_at_date = parse_iso_datetime(created_at_str)
            if not created_at_date:
                date_parse_errors_count += 1
                continue
            
            is_archived = ws.get("archived") is True

            if created_at_date <= END_OF_PREVIOUS_YEAR_CUTOFF and not is_archived:
                active_ws_end_prev_year += 1
                # --- MODIFICATION ---
                if hashable_workspace_id:
                    ids_active_at_start_of_year.add(hashable_workspace_id)
                elif raw_workspace_id_val is not None: # It existed but wasn't hashable by our function
                    unhashable_id_skips +=1


            if created_at_date <= CURRENT_SNAPSHOT_DATE_CUTOFF and not is_archived:
                active_ws_current_snapshot += 1
            
            if START_OF_CURRENT_YEAR <= created_at_date <= CURRENT_SNAPSHOT_DATE_CUTOFF:
                new_ws_created_this_year_gross += 1
                if not is_archived:
                    new_ws_created_this_year_and_active += 1
                else:
                    new_ws_created_this_year_and_archived += 1
            
            # --- MODIFICATION ---
            if hashable_workspace_id and hashable_workspace_id in ids_active_at_start_of_year and \
               is_archived and created_at_date <= CURRENT_SNAPSHOT_DATE_CUTOFF:
                 ids_archived_by_snapshot_that_were_active_start_of_year.add(hashable_workspace_id)
            elif raw_workspace_id_val is not None and hashable_workspace_id is None and \
                 hashable_workspace_id in ids_active_at_start_of_year: # check if the original check would have triggered
                 # This case is less likely now due to hashable_id check first
                 unhashable_id_skips +=1


        net_growth_absolute_this_year = active_ws_current_snapshot - active_ws_end_prev_year
        percentage_growth_this_year = 0
        if active_ws_end_prev_year > 0:
            percentage_growth_this_year = (net_growth_absolute_this_year / active_ws_end_prev_year) * 100
        elif net_growth_absolute_this_year > 0:
            percentage_growth_this_year = float('inf')

        lost_previously_active_ws_count = len(ids_archived_by_snapshot_that_were_active_start_of_year)

        print("\n--- Workspace Growth Metrics (Year 2025 up to June 3rd) ---")
        # ... (rest of the print statements are the same) ...
        print(f"Baseline: End of December 31, 2024")
        print(f"Current Snapshot: June 3, 2025")
        print("-----------------------------------------------------------------")
        
        print(f"\n1. Active Workspaces:")
        print(f"   - At end of Dec 2024: {active_ws_end_prev_year}")
        print(f"   - As at June 3, 2025: {active_ws_current_snapshot}")
        
        print(f"\n2. Net Growth in Active Workspaces (Jan 1, 2025 - June 3, 2025):")
        print(f"   - Absolute Growth: {net_growth_absolute_this_year:+} active workspaces")
        if percentage_growth_this_year == float('inf'):
            print(f"   - Percentage Growth: N/A (started from 0, now have {active_ws_current_snapshot})")
        else:
            print(f"   - Percentage Growth: {percentage_growth_this_year:+.2f}%")

        print(f"\n3. Workspace Creation & Archival This Year (Jan 1, 2025 - June 3, 2025):")
        print(f"   - Total New Workspaces Created: {new_ws_created_this_year_gross}")
        print(f"   - Of those, Currently Active: {new_ws_created_this_year_and_active}")
        print(f"   - Of those, Currently Archived: {new_ws_created_this_year_and_archived}")
        
        print(f"\n4. Workspace Attrition This Year (Jan 1, 2025 - June 3, 2025):")
        print(f"   - Workspaces Active at Start of 2025 but Archived by June 3, 2025: {lost_previously_active_ws_count}")
        print(f"     (Note: This indicates loss of workspaces that existed before 2025 or were created early in 2025 and then archived.)")
        

        print("\n--- Data Processing Summary ---")
        print(f"- Total raw entries processed from file: {processed_entries}")
        if json_line_parse_errors > 0:
            print(f"- Lines skipped due to invalid JSON structure: {json_line_parse_errors}")
        if missing_created_at_count > 0:
            print(f"- Entries skipped due to missing 'createdAt.$date': {missing_created_at_count}")
        if date_parse_errors_count > 0:
            print(f"- Entries skipped due to 'createdAt.$date' parsing errors: {date_parse_errors_count}")
        if unhashable_id_skips > 0:
            print(f"- Workspace entries skipped for set operations due to unhashable/unrecognized 'workspaceId' structure: {unhashable_id_skips}")


    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Get the script name for the file path if needed, or keep it hardcoded
    # SCRIPT_NAME = "monthmetricscript.py" # Or whatever you named it
    print(f"Analyzing workspace data from: {JSON_FILE_PATH}")
    analyze_growth_metrics(JSON_FILE_PATH)