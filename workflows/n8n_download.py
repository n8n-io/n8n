#!/usr/bin/env python3

import json
import logging
import pathlib
import re
import time
import requests
from requests.exceptions import RequestException, JSONDecodeError
import os # Needed for path joining if not using pathlib everywhere (though pathlib is better)

# --- Configuration ---
API_BASE_URL = "https://api.n8n.io"
SEARCH_ENDPOINT = f"{API_BASE_URL}/templates/search"
WORKFLOW_ENDPOINT_TEMPLATE = f"{API_BASE_URL}/templates/workflows/{{wf_id}}" # Use f-string later
SAVE_DIR_BASE = pathlib.Path("n8n-templates-sorted") # Base directory for sorted folders
PER_PAGE = 250  # Max allowed by n8n API
SLEEP_DURATION = 0.5 # Increased slightly for extra politeness
REQUEST_TIMEOUT = 30 # Timeout for requests in seconds
USER_AGENT = "N8nTemplateDownloader/1.2 (Python script; +keyword_filtering)" # Identify your client

# --- Keyword Filtering Configuration ---
# Keys: Folder names (will be sanitized)
# Values: Lists of case-insensitive keywords to search for in name/description
# Put the most specific categories first if SAVE_IN_MULTIPLE_FOLDERS is False
KEYWORD_FOLDERS = {
    "Google": ["google", "gmail", "gcp", "sheets", "drive", "gcal", "calendar", "bigquery", "gcs"],
    "AWS": ["aws", "s3", "lambda", "ec2", "sqs", "sns", "dynamodb", "rds", "rekognition"],
    "Microsoft": ["microsoft", "azure", "office", "outlook", "onedrive", "teams", "sharepoint", "excel"],
    "AI": ["ai", "gpt", "openai", "claude", "anthropic", "llm", "gemini", "huggingface", "mistral", "nlp", "vision", "tensorflow"],
    "SocialMedia": ["twitter", "facebook", "instagram", "linkedin", "social", "discord", "slack", "telegram", "whatsapp"],
    "Databases": ["database", "sql", "postgres", "mysql", "mongodb", "firebase", "redis", "airtable", "supabase", "baserow"],
    "CRM_Sales": ["crm", "salesforce", "hubspot", "pipedrive", "zoho"],
    "DevOps_Infra": ["docker", "kubernetes", "git", "github", "gitlab", "jenkins", "terraform", "ansible", "cloudflare"],
    "Finance_Accounting": ["finance", "stripe", "paypal", "quickbooks", "xero", "accounting"],
    "Utilities": ["utility", "helper", "tool", "webhook", "schedule", "rss", "xml", "csv"],
    "Uncategorized": [] # Catch-all if no keywords match (MUST be last if used)
}
# Decide if a workflow matching multiple keywords should be saved in multiple folders
SAVE_IN_MULTIPLE_FOLDERS = True

# --- Setup Logging ---
# Set level to INFO for good visibility during runtime
# Set level to DEBUG for maximum verbosity (requests details, sleep messages, etc.)
LOG_LEVEL = logging.INFO
logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler() # Log to console
        # Optional: Log to file
        # logging.FileHandler("download_templates.log", encoding='utf-8')
    ]
)

# Suppress overly verbose logs from underlying libraries if desired
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)


def sanitize_filename(name: str) -> str:
    """Removes or replaces characters invalid for filesystem paths."""
    if not isinstance(name, str):
        logging.warning(f"Invalid input type for sanitize_filename: {type(name)}. Using 'invalid_name'.")
        name = "invalid_name"

    # Replace likely path separators first
    name = name.replace('/', '_').replace('\\', '_')

    # Remove characters that are definitely invalid or problematic on most systems
    # Including control characters, etc.
    name = re.sub(r'[<>:"|?*\x00-\x1f]', '', name)

    # Replace multiple consecutive underscores/spaces/periods with a single underscore
    name = re.sub(r'[\s._]+', '_', name)

    # Remove leading/trailing underscores/spaces/periods that might cause issues
    name = name.strip('._ ')

    # Limit overall length (important for cross-platform compatibility)
    max_len = 150 # Adjust as needed, but keep reasonably short
    if len(name) > max_len:
        original_name_short = name[:20] # Keep for logging context
        # Simple truncation - might cut mid-word but is safe
        name = name[:max_len].strip('._ ') # Strip again after truncation
        logging.debug(f"Truncated long filename part (starting '{original_name_short}...') to: {name}")

    # Handle potentially empty names after sanitization
    if not name:
        return "unnamed_workflow"

    return name

def download_templates():
    """Downloads and sorts community templates from the n8n API based on keywords."""
    start_time = time.time()
    SAVE_DIR_BASE.mkdir(exist_ok=True)

    # Create keyword folders beforehand, storing the mapping
    sanitized_folder_paths = {}
    logging.info("Creating output directories...")
    for folder_key in KEYWORD_FOLDERS.keys():
        safe_folder_name = sanitize_filename(folder_key) # Sanitize folder names too!
        folder_path = SAVE_DIR_BASE / safe_folder_name
        try:
            folder_path.mkdir(exist_ok=True)
            sanitized_folder_paths[folder_key] = folder_path
            logging.debug(f"Ensured directory exists: {folder_path}")
        except OSError as e:
            logging.error(f"Could not create directory {folder_path}: {e}. Skipping this category.")
        except Exception as e:
             logging.error(f"Unexpected error creating directory for '{folder_key}': {e}. Skipping category.")


    if not sanitized_folder_paths and KEYWORD_FOLDERS:
        logging.error("Failed to create any keyword directories. Aborting.")
        return 0

    downloaded_count = 0
    processed_count = 0
    skipped_count = 0
    error_count = 0
    page = 1
    fetch_errors = 0
    max_fetch_errors = 5 # Stop if too many consecutive page fetch errors occur

    # Use a session for connection pooling and default headers
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    logging.info(f"Starting download/sort of n8n templates into base directory '{SAVE_DIR_BASE}'...")
    logging.info(f"Filtering based on keywords into folders: {list(sanitized_folder_paths.keys())}")
    if SAVE_IN_MULTIPLE_FOLDERS:
        logging.info("Workflows matching multiple categories WILL be saved in multiple folders.")
    else:
        logging.info("Workflows matching multiple categories will ONLY be saved in the FIRST matched folder.")
    if "Uncategorized" in sanitized_folder_paths:
         logging.info("Workflows matching no keywords will be saved in 'Uncategorized'.")
    else:
         logging.info("Workflows matching no keywords will be SKIPPED.")


    while True:
        logging.info(f"--- Fetching Page {page} (Max {PER_PAGE} templates) ---")
        search_params = {"page": page, "rows": PER_PAGE}

        try:
            response = session.get(
                SEARCH_ENDPOINT,
                params=search_params,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
            data = response.json()
            fetch_errors = 0 # Reset error count on success

        except JSONDecodeError as e:
            logging.error(f"Failed to decode JSON response for page {page}. Content: {response.text[:500]}... Error: {e}")
            fetch_errors += 1
            if fetch_errors >= max_fetch_errors:
                 logging.error(f"Stopping due to {fetch_errors} consecutive JSON decode errors.")
                 break
            logging.warning(f"Skipping page {page} due to JSON decode error. Continuing...")
            page += 1 # Move to next page even if current failed
            time.sleep(SLEEP_DURATION * 2) # Longer sleep after error
            continue # Try next page
        except RequestException as e:
            logging.error(f"Network or HTTP error fetching page {page}: {e}")
            fetch_errors += 1
            if fetch_errors >= max_fetch_errors:
                 logging.error(f"Stopping download due to {fetch_errors} consecutive network/HTTP errors.")
                 break
            logging.warning(f"Retrying page {page} after delay...")
            time.sleep(SLEEP_DURATION * 3) # Longer sleep after error
            continue # Retry the same page
        except Exception as e:
             logging.error(f"Unexpected error fetching page {page}: {e}", exc_info=True)
             fetch_errors += 1
             if fetch_errors >= max_fetch_errors:
                 logging.error(f"Stopping download due to {fetch_errors} consecutive unexpected errors.")
                 break
             logging.warning(f"Skipping page {page} due to unexpected error. Continuing...")
             page += 1
             time.sleep(SLEEP_DURATION * 2)
             continue


        workflows = data.get("workflows") # Use .get for safety
        if workflows is None:
            logging.error(f"API response for page {page} missing 'workflows' key. Response: {data}")
            break # Stop if the structure is fundamentally wrong
        if not isinstance(workflows, list):
             logging.error(f"'workflows' key on page {page} is not a list. Response: {data}")
             break # Stop if the structure is fundamentally wrong

        if not workflows: # Empty list means no more workflows *on this page*
            # Double check if it's really the end or just an empty page
            # Some APIs might return empty pages before the final one if data was deleted.
            # Let's assume n8n API is well-behaved: empty list means the end.
            logging.info("Found no more workflows on the current page. Assuming end of results.")
            break

        logging.info(f"Processing {len(workflows)} workflow metadata entries from page {page}...")
        workflows_saved_on_page = 0
        for wf_meta in workflows:
            processed_count += 1
            wf_id = None # Ensure wf_id is defined for logging in case of early error
            try:
                # Extract metadata safely
                wf_id = wf_meta.get("id")
                wf_name = wf_meta.get("name")
                wf_description = wf_meta.get("description", "") # Assume description might be in search results

                if not wf_id:
                    logging.warning(f"Skipping workflow entry with missing ID. Metadata: {wf_meta}")
                    skipped_count += 1
                    continue
                if not wf_name:
                     logging.warning(f"Workflow ID {wf_id} has missing name. Using 'unnamed'. Metadata: {wf_meta}")
                     wf_name = "unnamed"


                logging.info(f"Processing Workflow -> ID: {wf_id}, Name: '{wf_name}'")

                # --- Keyword Matching ---
                matched_folder_keys = []
                # Combine name and description for broader matching
                search_text = f"{wf_name} {wf_description}".lower()

                for folder_key, keywords in KEYWORD_FOLDERS.items():
                    # Skip the check for the 'Uncategorized' key itself
                    if folder_key == "Uncategorized" or folder_key not in sanitized_folder_paths:
                         continue

                    for keyword in keywords:
                        # Use simple substring matching (case-insensitive)
                        if keyword.lower() in search_text:
                            matched_folder_keys.append(folder_key)
                            # If we only save in the first matched folder, break inner keyword loop
                            if not SAVE_IN_MULTIPLE_FOLDERS:
                                break
                    # If we only save in the first matched folder and found one, break outer folder loop
                    if not SAVE_IN_MULTIPLE_FOLDERS and matched_folder_keys:
                         break

                target_folder_paths = []
                if matched_folder_keys:
                    # Get the actual Path objects for the matched keys
                    target_folder_paths = [sanitized_folder_paths[key] for key in matched_folder_keys if key in sanitized_folder_paths]
                elif "Uncategorized" in sanitized_folder_paths:
                     # If no keywords matched and "Uncategorized" folder exists, use it
                     target_folder_paths = [sanitized_folder_paths["Uncategorized"]]

                if not target_folder_paths:
                    # If no keywords matched and no "Uncategorized" folder defined or created, skip
                     logging.debug(f"Skipping workflow ID {wf_id} ('{wf_name}') - No keyword match or target folder.")
                     skipped_count += 1
                     continue # Skip fetching/saving this workflow

                # --- Fetch Full Workflow JSON ---
                logging.debug(f"Keyword match found. Fetching full JSON details for workflow ID: {wf_id}")
                wf_url = WORKFLOW_ENDPOINT_TEMPLATE.format(wf_id=wf_id)
                try:
                    wf_response = session.get(wf_url, timeout=REQUEST_TIMEOUT)
                    wf_response.raise_for_status()
                    wf_json_data = wf_response.json()
                except JSONDecodeError as e:
                     logging.warning(f"Failed to decode JSON for workflow ID {wf_id} from {wf_url}. Skipping. Error: {e}")
                     skipped_count += 1
                     error_count += 1
                     continue
                except RequestException as e:
                     logging.warning(f"Network/HTTP error fetching workflow ID {wf_id} from {wf_url}. Skipping. Error: {e}")
                     skipped_count += 1
                     error_count += 1
                     continue # Skip this workflow

                # --- Save Workflow to Matched Folders ---
                safe_wf_name_part = sanitize_filename(wf_name)
                filename = f"{wf_id}-{safe_wf_name_part}.json"

                saved_this_iteration = False
                for target_path in target_folder_paths:
                    filepath = target_path / filename
                    try:
                        # Write the JSON data
                        filepath.write_text(
                            json.dumps(wf_json_data, indent=2, ensure_ascii=False),
                            encoding='utf-8'
                        )
                        logging.info(f"Saved: '{filepath}'")
                        saved_this_iteration = True

                    except OSError as e:
                        logging.error(f"Failed to write file {filepath}: {e}")
                        error_count += 1
                        # Decide whether to continue trying other folders for this WF
                        # For now, we log error and move on.
                    except Exception as e: # Catch potential JSON dump errors etc.
                        logging.error(f"Error processing/saving workflow {wf_id} to {filepath}: {e}", exc_info=True)
                        error_count += 1

                if saved_this_iteration:
                    downloaded_count += 1 # Increment overall count only once per unique workflow saved
                    workflows_saved_on_page += 1


            # --- Broad Exception Handling for single workflow processing ---
            except Exception as e:
                 # Log unexpected errors during the processing of a single workflow metadata entry
                 logging.error(f"Unexpected error processing workflow metadata loop for ID '{wf_id}': {e}", exc_info=True)
                 error_count += 1
                 skipped_count += 1
                 continue # Continue to the next workflow in the list

        logging.info(f"--- Page {page} Summary: Processed {len(workflows)}, Saved {workflows_saved_on_page} ---")

        # Check if this was the last page *after* processing it
        # Crucially, check if the number *returned* was less than requested.
        # Checking `if not workflows:` earlier handles truly empty lists.
        if len(workflows) < PER_PAGE:
            logging.info("Received fewer workflows than requested, indicating this was the last page.")
            break

        # Prepare for the next page
        page += 1
        logging.debug(f"Sleeping for {SLEEP_DURATION} seconds before next page...")
        time.sleep(SLEEP_DURATION) # Be polite between page requests

    # --- End of Loop ---
    end_time = time.time()
    duration = end_time - start_time
    logging.info("="*40)
    logging.info("                DOWNLOAD SUMMARY")
    logging.info("="*40)
    logging.info(f"Total time taken: {duration:.2f} seconds")
    logging.info(f"Total workflow metadata entries processed: {processed_count}")
    logging.info(f"Total unique workflows saved (matching criteria): {downloaded_count}")
    logging.info(f"Total workflows skipped (no match or missing data): {skipped_count}")
    logging.info(f"Total errors encountered (fetch/save): {error_count}")
    logging.info(f"Templates saved in base directory: '{SAVE_DIR_BASE.resolve()}'")
    logging.info("="*40)

    return downloaded_count

if __name__ == "__main__":
    # Ensure the script can be run directly
    download_templates()
    logging.info("Script finished.")