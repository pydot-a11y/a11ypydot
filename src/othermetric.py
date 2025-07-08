import json
from datetime import datetime, timezone
from collections import Counter

# --- Configuration ---
JSON_FILE_PATH = "workspaces.json"

# Define the range of months
RANGE_START_YEAR = 2024
RANGE_START_MONTH = 12
RANGE_END_YEAR = 2025
RANGE_END_MONTH = 6
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

def count_creations_for_month_range(file_path):
    """
    Counts workspaces created for each month in the specified range.
    """
    monthly_creations_count = Counter() # Stores counts as {(year, month): count}
    
    processed_entries = 0
    missing_created_at_count = 0
    date_parse_errors_count = 0
    json_line_parse_errors = 0

    # Define the start and end points for tuple comparison
    range_start_tuple = (RANGE_START_YEAR, RANGE_START_MONTH)
    range_end_tuple = (RANGE_END_YEAR, RANGE_END_MONTH)

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

            created_year = created_at_date.year
            created_month = created_at_date.month
            created_year_month_tuple = (created_year, created_month)

            # Check if the creation month is within our desired range
            if range_start_tuple <= created_year_month_tuple <= range_end_tuple:
                monthly_creations_count[created_year_month_tuple] += 1
        
        print("\n--- Workspace Creation Counts per Month ---")
        print(f"For the period: {datetime(RANGE_START_YEAR, RANGE_START_MONTH, 1).strftime('%B %Y')} to {datetime(RANGE_END_YEAR, RANGE_END_MONTH, 1).strftime('%B %Y')}\n")

        current_year = RANGE_START_YEAR
        current_month = RANGE_START_MONTH
        
        while (current_year, current_month) <= range_end_tuple:
            month_name = datetime(current_year, current_month, 1).strftime("%B")
            count = monthly_creations_count.get((current_year, current_month), 0)
            print(f"- {month_name} {current_year}: {count} workspaces created")
            
            # Move to the next month
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
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
    count_creations_for_month_range(JSON_FILE_PATH)