import json
from datetime import datetime, timezone

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json"

# Define the cutoff dates (end of the respective months)
# End of December 2024
AS_AT_DEC_2024_CUTOFF = datetime(2024, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)

# End of June 2025
AS_AT_JUNE_2025_CUTOFF = datetime(2025, 6, 30, 23, 59, 59, 999999, tzinfo=timezone.utc)
# --- End Configuration ---

def parse_iso_datetime(date_str):
    """
    Parses an ISO 8601 datetime string, handling the 'Z' for UTC.
    Returns a timezone-aware datetime object or None if parsing fails.
    """
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
                # print(f"Warning: Could not parse date string: {date_str}")
                return None

def count_workspaces_as_at_dates(file_path):
    """
    Counts non-archived workspaces created on or before specified cutoff dates.
    """
    active_workspaces_as_at_dec_2024 = 0
    active_workspaces_as_at_june_2025 = 0
    
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
            
            # Check if the workspace is currently archived
            # If 'archived' field is missing, we assume it's not archived.
            is_archived = ws.get("archived") is True 

            if not is_archived:
                # Check for "as at Dec 2024"
                if created_at_date <= AS_AT_DEC_2024_CUTOFF:
                    active_workspaces_as_at_dec_2024 += 1
                
                # Check for "as at June 2025"
                # Note: A workspace counted for Dec 2024 will also be counted for June 2025
                # if it meets the June 2025 date criteria, which it will.
                # This separate check ensures all workspaces up to June 2025 are counted.
                if created_at_date <= AS_AT_JUNE_2025_CUTOFF:
                    active_workspaces_as_at_june_2025 += 1
            
        print("\n--- Cumulative Active Workspace Counts ---")
        print("Note: Counts workspaces created on or before the date, AND are NOT currently archived.")
        print(f"\nTotal active workspaces as at end of December 2024: {active_workspaces_as_at_dec_2024}")
        print(f"Total active workspaces as at end of June 2025: {active_workspaces_as_at_june_2025}")

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
    count_workspaces_as_at_dates(JSON_FILE_PATH)