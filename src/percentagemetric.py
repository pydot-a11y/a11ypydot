import json
from datetime import datetime, timezone, timedelta

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json"

# Define the cutoff dates (end of the respective months)
AS_AT_DEC_2024_CUTOFF = datetime(2024, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)
AS_AT_JUNE_2025_CUTOFF = datetime(2025, 6, 30, 23, 59, 59, 999999, tzinfo=timezone.utc)

# Interim period starts right after the first cutoff
INTERIM_PERIOD_START = AS_AT_DEC_2024_CUTOFF + timedelta(microseconds=1)
INTERIM_PERIOD_END = AS_AT_JUNE_2025_CUTOFF
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
                return None

def calculate_workspace_metrics(file_path):
    active_workspaces_as_at_dec_2024 = 0
    active_workspaces_as_at_june_2025 = 0
    
    workspaces_created_in_interim = 0
    archived_from_interim_creations = 0
    
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
                        except json.JSONDecodeError:
                            json_line_parse_errors += 1
        
        if not data_objects and json_line_parse_errors == 0 and processed_entries == 0:
            print("No data objects found or successfully parsed from the file.")
            return

        processed_entries = len(data_objects)

        for ws in data_objects:
            created_at_str = ws.get("createdAt", {}).get("$date")
            if not created_at_str:
                missing_created_at_count += 1
                continue

            created_at_date = parse_iso_datetime(created_at_str)
            if not created_at_date:
                date_parse_errors_count += 1
                continue
            
            is_archived = ws.get("archived") is True 

            # Calculate cumulative active workspaces
            if not is_archived:
                if created_at_date <= AS_AT_DEC_2024_CUTOFF:
                    active_workspaces_as_at_dec_2024 += 1
                
                if created_at_date <= AS_AT_JUNE_2025_CUTOFF:
                    active_workspaces_as_at_june_2025 += 1
            
            # Analyze the interim period (Jan 2025 - June 2025)
            if INTERIM_PERIOD_START <= created_at_date <= INTERIM_PERIOD_END:
                workspaces_created_in_interim += 1
                if is_archived:
                    archived_from_interim_creations += 1
            
        print("\n--- Cumulative Active Workspace Counts ---")
        print("Note: Counts workspaces created on or before the date, AND are NOT currently archived.")
        print(f"\nTotal active workspaces as at end of December 2024: {active_workspaces_as_at_dec_2024}")
        print(f"Total active workspaces as at end of June 2025: {active_workspaces_as_at_june_2025}")

        # --- Growth and Interim Period Metrics ---
        print("\n--- Growth & Interim Period Analysis (Jan 2025 - June 2025) ---")
        
        net_new_active_workspaces = active_workspaces_as_at_june_2025 - active_workspaces_as_at_dec_2024
        print(f"Net new active workspaces added: {net_new_active_workspaces}")

        if active_workspaces_as_at_dec_2024 > 0:
            percentage_growth = (net_new_active_workspaces / active_workspaces_as_at_dec_2024) * 100
            print(f"Percentage growth in active workspaces: {percentage_growth:.2f}%")
        elif net_new_active_workspaces > 0 : # Grew from 0
             print(f"Percentage growth in active workspaces: N/A (grew from 0)")
        else: # Stayed at 0 or somehow decreased from 0 (should not happen with this logic)
            print(f"Percentage growth in active workspaces: 0.00% (or started at 0)")

        print(f"\nDuring the interim period (Jan 2025 - June 2025):")
        print(f"  - Workspaces created: {workspaces_created_in_interim}")
        print(f"  - Of those, currently archived: {archived_from_interim_creations}")
        
        if workspaces_created_in_interim > 0:
            active_from_interim = workspaces_created_in_interim - archived_from_interim_creations
            retention_rate_interim = (active_from_interim / workspaces_created_in_interim) * 100
            print(f"  - Active workspaces from interim creations: {active_from_interim}")
            print(f"  - Effective retention rate for interim creations: {retention_rate_interim:.2f}%")
        else:
            print(f"  - No workspaces were created in the interim period to calculate retention.")


        print("\n--- Data Processing Summary ---")
        print(f"- Total raw entries processed from file: {processed_entries}")
        if json_line_parse_errors > 0:
            print(f"- Lines skipped due to invalid JSON structure: {json_line_parse_errors}")
        if missing_created_at_count > 0:
            print(f"- Entries skipped due to missing 'createdAt.$date': {missing_created_at_count}")
        if date_parse_errors_count > 0:
            print(f"- Entries skipped due to 'createdAt.$date' parsing errors: {date_parse_errors_count}")

    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(f"Analyzing workspace data from: {JSON_FILE_PATH}")
    calculate_workspace_metrics(JSON_FILE_PATH)