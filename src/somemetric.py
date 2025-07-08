import json
from datetime import datetime, timezone

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json"

# Define the specific months and years
# December 2024
DEC_2024_YEAR = 2024
DEC_2024_MONTH = 12
DEC_2024_START = datetime(DEC_2024_YEAR, DEC_2024_MONTH, 1, 0, 0, 0, tzinfo=timezone.utc)
# To get the end of December, go to Jan 1st of next year and subtract a microsecond, or know it's the 31st
DEC_2024_END = datetime(DEC_2024_YEAR, DEC_2024_MONTH, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)

# June 2025
JUNE_2025_YEAR = 2025
JUNE_2025_MONTH = 6
JUNE_2025_START = datetime(JUNE_2025_YEAR, JUNE_2025_MONTH, 1, 0, 0, 0, tzinfo=timezone.utc)
# June has 30 days
JUNE_2025_END = datetime(JUNE_2025_YEAR, JUNE_2025_MONTH, 30, 23, 59, 59, 999999, tzinfo=timezone.utc)
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
            # Fallback for slightly different ISO formats if needed
            return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
        except ValueError:
            try:
                return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S+00:00')
            except ValueError:
                # print(f"Warning: Could not parse date string: {date_str}") # Optional
                return None

def count_creations_for_months(file_path):
    """
    Counts workspaces created in specified months.
    """
    dec_2024_creations = 0
    june_2025_creations = 0
    
    processed_entries = 0
    missing_created_at_count = 0
    date_parse_errors_count = 0
    json_line_parse_errors = 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data_objects = json.load(f)
                if not isinstance(data_objects, list): # If it's a single object, make it a list
                    data_objects = [data_objects]
            except json.JSONDecodeError:
                # If loading as array fails, try JSON Lines format
                f.seek(0) # Reset file pointer
                data_objects = []
                for line_number, line in enumerate(f, 1):
                    line = line.strip()
                    if line: # Skip empty lines
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
                missing_created_at_count +=1
                continue # Skip to next workspace if no creation date

            created_at_date = parse_iso_datetime(created_at_str)
            if not created_at_date:
                date_parse_errors_count +=1
                continue # Skip if date parsing failed

            # Check for December 2024 creations
            if DEC_2024_START <= created_at_date <= DEC_2024_END:
                dec_2024_creations += 1
            
            # Check for June 2025 creations
            # Using 'elif' is fine here since a workspace can't be created in both distinct months
            # but separate 'if' also works and might be slightly clearer if you add more months later.
            if JUNE_2025_START <= created_at_date <= JUNE_2025_END:
                june_2025_creations += 1
        
        print("\n--- Workspace Creation Counts ---")
        print(f"Number of workspaces created in December 2024: {dec_2024_creations}")
        print(f"Number of workspaces created in June 2025: {june_2025_creations}")

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
    count_creations_for_months(JSON_FILE_PATH)