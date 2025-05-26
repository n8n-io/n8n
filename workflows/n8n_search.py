#!/usr/bin/env python3

import json
import logging
import pathlib
import re
import time
import requests
from requests.exceptions import RequestException, JSONDecodeError
import sys # To exit gracefully

# --- Configuration ---
API_BASE_URL = "https://api.n8n.io"
SEARCH_ENDPOINT = f"{API_BASE_URL}/templates/search"
WORKFLOW_ENDPOINT_TEMPLATE = f"{API_BASE_URL}/templates/workflows/{{wf_id}}"
SAVE_DIR = pathlib.Path("n8n-selected-templates") # Directory to save selected templates
PER_PAGE = 100  # Fetch fewer per page for interactive search to feel faster initially
SLEEP_DURATION = 0.3 # Politeness sleep between page fetches
REQUEST_TIMEOUT = 20 # Timeout for requests
USER_AGENT = "N8nTemplateInteractiveSearch/1.0"

# --- Setup Logging (for errors/debug, not user interaction) ---
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper Functions ---

def sanitize_filename(name: str) -> str:
    """Removes or replaces characters invalid for filesystem paths."""
    if not isinstance(name, str): name = "invalid_name"
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    name = re.sub(r'\s+', '_', name) # Replace whitespace with underscore
    name = name.strip('._ ')
    max_len = 150
    if len(name) > max_len:
        name = name[:max_len].strip('._ ')
    if not name: return "unnamed_workflow"
    return name

def parse_selection(selection_str: str, max_index: int) -> set[int]:
    """Parses user selection string (e.g., "1, 3-5, 8") into a set of indices."""
    selected_indices = set()
    if not selection_str:
        return selected_indices # Empty set for empty input

    parts = selection_str.split(',')
    for part in parts:
        part = part.strip()
        if not part: continue

        if '-' in part:
            # Handle range
            try:
                start_str, end_str = part.split('-', 1)
                start = int(start_str.strip())
                end = int(end_str.strip())
                if start < 1 or end > max_index or start > end:
                    print(f"  Invalid range: {part}. Must be between 1 and {max_index}.")
                    continue # Skip this invalid part
                selected_indices.update(range(start, end + 1))
            except ValueError:
                print(f"  Invalid range format: {part}. Use 'start-end'.")
                continue # Skip invalid format
        else:
            # Handle single number
            try:
                index = int(part)
                if 1 <= index <= max_index:
                    selected_indices.add(index)
                else:
                    print(f"  Invalid number: {index}. Must be between 1 and {max_index}.")
            except ValueError:
                print(f"  Invalid input: {part}. Please enter numbers, ranges (e.g., 2-5), 'all', or 'none'.")
                continue # Skip non-integer input

    return selected_indices

def find_matching_templates(keywords: list[str], session: requests.Session) -> list[dict]:
    """Fetches templates page by page and filters locally by keywords (AND logic)."""
    matching_templates = []
    page = 1
    print("Searching templates (this may take a moment)...")
    processed_count = 0
    while True:
        print(f"  Fetching page {page}...")
        search_params = {"page": page, "rows": PER_PAGE}
        try:
            response = session.get(SEARCH_ENDPOINT, params=search_params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
        except RequestException as e:
            logging.error(f"Network error fetching page {page}: {e}")
            print(f"  Error fetching page {page}. Stopping search.")
            break # Stop search on error
        except JSONDecodeError as e:
             logging.error(f"JSON decode error fetching page {page}: {e}. Response text: {response.text[:200]}")
             print(f"  Error reading data from page {page}. Stopping search.")
             break # Stop search on error

        workflows_on_page = data.get("workflows", [])
        if not isinstance(workflows_on_page, list):
             logging.error(f"Unexpected data format for 'workflows' on page {page}")
             print(f"  Unexpected data format from server on page {page}. Stopping search.")
             break

        if not workflows_on_page:
            print("  Reached end of template list.")
            break # No more workflows

        for wf_meta in workflows_on_page:
            processed_count += 1
            name = wf_meta.get("name", "").lower()
            description = wf_meta.get("description", "").lower()
            search_text = f"{name} {description}"

            # Check if ALL keywords are present (AND logic)
            if all(keyword in search_text for keyword in keywords):
                # Store essential info for display and later download
                matching_templates.append({
                    "id": wf_meta.get("id"),
                    "name": wf_meta.get("name", "Unnamed Workflow")
                })
                print(f"    Found match: ID {wf_meta.get('id')} - {wf_meta.get('name')}") # Show matches as they are found

        if len(workflows_on_page) < PER_PAGE:
            print(f"  Reached end of template list (last page had {len(workflows_on_page)} items).")
            break # Last page

        page += 1
        time.sleep(SLEEP_DURATION) # Be polite

    print(f"Search complete. Processed {processed_count} templates.")
    return matching_templates

def download_selected_templates(templates_to_download: list[dict], session: requests.Session):
    """Fetches full JSON and saves the selected templates."""
    if not templates_to_download:
        print("No templates selected for download.")
        return

    print(f"\nDownloading {len(templates_to_download)} selected templates...")
    SAVE_DIR.mkdir(exist_ok=True)
    download_count = 0
    error_count = 0

    for wf_meta in templates_to_download:
        wf_id = wf_meta.get("id")
        wf_name = wf_meta.get("name", "unnamed")
        if not wf_id:
            print(f"  Skipping entry with missing ID: {wf_meta}")
            error_count += 1
            continue

        print(f"  Downloading ID: {wf_id} ('{wf_name}')...")
        wf_url = WORKFLOW_ENDPOINT_TEMPLATE.format(wf_id=wf_id)
        try:
            wf_response = session.get(wf_url, timeout=REQUEST_TIMEOUT)
            wf_response.raise_for_status()
            wf_json_data = wf_response.json()

            # Save the workflow JSON
            safe_name = sanitize_filename(wf_name)
            filename = f"{wf_id}-{safe_name}.json"
            filepath = SAVE_DIR / filename

            try:
                filepath.write_text(
                    json.dumps(wf_json_data, indent=2, ensure_ascii=False),
                    encoding='utf-8'
                )
                print(f"    Saved: {filepath.name}")
                download_count += 1
            except OSError as e:
                logging.error(f"Failed to write file {filepath}: {e}")
                print(f"    ERROR saving {filepath.name}: {e}")
                error_count += 1

        except RequestException as e:
            logging.error(f"Network/HTTP error fetching workflow ID {wf_id}: {e}")
            print(f"    ERROR downloading ID {wf_id}: {e}")
            error_count += 1
        except JSONDecodeError as e:
            logging.error(f"JSON decode error for workflow ID {wf_id}: {e}. Response: {wf_response.text[:200]}")
            print(f"    ERROR reading data for ID {wf_id}. Skipping.")
            error_count += 1
        except Exception as e:
             logging.error(f"Unexpected error downloading/saving {wf_id}: {e}", exc_info=True)
             print(f"    UNEXPECTED ERROR for ID {wf_id}. Skipping.")
             error_count += 1

    print("\nDownload Summary:")
    print(f"  Successfully downloaded: {download_count}")
    print(f"  Errors encountered: {error_count}")
    if download_count > 0:
        print(f"  Files saved to: {SAVE_DIR.resolve()}")

# --- Main Execution Logic ---

def main():
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    while True: # Main loop to allow multiple searches
        # 1. Get Keywords
        print("\nEnter keywords to search for (comma-separated, requires ALL keywords to match).")
        keyword_input = input("Keywords (or press Enter to exit): ").strip()

        if not keyword_input:
            print("Exiting.")
            break

        # Prepare keywords: lowercase, stripped, non-empty
        keywords = [k.strip().lower() for k in keyword_input.split(',') if k.strip()]
        if not keywords:
            print("No valid keywords entered. Please try again.")
            continue

        print(f"\nSearching for templates containing ALL of: {', '.join(keywords)}")

        # 2. Find Matches
        matching_templates = find_matching_templates(keywords, session)

        if not matching_templates:
            print("\nNo templates found matching all your keywords.")
            if input("Search again? (y/n): ").lower() != 'y':
                break
            else:
                continue # Go back to keyword prompt

        # 3. Display Results
        print("\n--- Matching Templates ---")
        for i, wf in enumerate(matching_templates, start=1):
            print(f"{i:>3}. ID: {wf['id']:<6} Name: {wf['name']}")
        print("-------------------------")

        # 4. Get User Selection
        selected_indices = set()
        while True: # Loop for selection input
            print("\nEnter numbers to download (e.g., 1, 3, 5-7), 'all', or 'none' to cancel.")
            selection_input = input("Selection: ").strip().lower()

            if selection_input == 'none':
                print("Selection cancelled.")
                selected_indices = set()
                break # Exit selection loop
            elif selection_input == 'all':
                selected_indices = set(range(1, len(matching_templates) + 1))
                print(f"  Selected all {len(matching_templates)} templates.")
                break # Exit selection loop
            else:
                selected_indices = parse_selection(selection_input, len(matching_templates))
                if selected_indices:
                    print(f"  Selected {len(selected_indices)} templates: {sorted(list(selected_indices))}")
                    break # Exit selection loop
                else:
                    print("  No valid selections made. Please try again or enter 'none'.")
                    # Loop continues for re-entry

        # 5. Download if selections were made
        if selected_indices:
            # Map 1-based indices back to 0-based list indices
            templates_to_download = [matching_templates[i-1] for i in sorted(list(selected_indices))]
            download_selected_templates(templates_to_download, session)

        # 6. Ask to search again
        if input("\nPerform another search? (y/n): ").lower() != 'y':
            print("Exiting.")
            break # Exit main loop

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user. Exiting.")
        sys.exit(0)