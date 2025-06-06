#!/usr/bin/env bash
# run_cypress.sh - Cypress test runner for n8n QA automation
# This script is designed to be executed within the n8n Docker container.
# Usage: ./run_cypress.sh [--dry] <spec_file_name.spec.js>
# Example:
#   Dry run (lint only): ./run_cypress.sh --dry my_test.spec.js
#   Full execution:      ./run_cypress.sh my_test.spec.js

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
# These paths should align with the Dockerfile and n8n workflow setup.
readonly CYPRESS_DIR="/home/node/cypress"
readonly REPORTS_DIR="${CYPRESS_DIR}/reports"
readonly SPECS_DIR="${CYPRESS_DIR}/e2e"
readonly LOG_FILE_NAME="cypress-run.log" # Log file will be within the unique report directory
readonly MAX_MEMORY="384" # Max Node.js memory in MB, suitable for Render free tier
readonly CYPRESS_CACHE_FOLDER="/tmp/cy-cache" # Shared Cypress cache
readonly DEFAULT_TIMEOUT_SECONDS=300  # 5 minutes timeout for the entire Cypress run

# --- Script Variables ---
DRY_RUN=false
SPEC_FILE_ARG="" # The argument passed to the script (just the filename)
TIMESTAMP=$(date +%Y%m%d_%H%M%S%3N) # Timestamp for unique report directory
REPORT_BASE_DIR="${REPORTS_DIR}/${TIMESTAMP}" # Unique directory for this run's reports
LOG_FILE_PATH="${REPORT_BASE_DIR}/${LOG_FILE_NAME}" # Full path to the log file

# --- Helper Functions ---

# Log a message to both stdout and the log file
log_message() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE_PATH}"
}

# Ensure necessary directories exist
setup_directories() {
  mkdir -p "${REPORTS_DIR}" # Ensure base reports directory exists
  mkdir -p "${REPORT_BASE_DIR}" # Create unique directory for this run
  mkdir -p "${CYPRESS_CACHE_FOLDER}" # Ensure Cypress cache folder exists
  # The SPECS_DIR is assumed to be populated by n8n before this script runs.
}

# Cleanup temporary files on exit
cleanup() {
  log_message "Cleaning up temporary files..."
  # Example: find "${CYPRESS_CACHE_FOLDER}" -type f -name "*.tmp" -delete
  # Add any other specific cleanup tasks here if needed.
  log_message "Cleanup finished."
}

# --- Argument Parsing ---
parse_arguments() {
  if [[ "$1" == "--dry" ]]; then
    DRY_RUN=true
    shift # Remove --dry from arguments
  fi

  if [[ -z "$1" ]]; then
    log_message "ERROR: No spec file name provided."
    # Output a result.json indicating script failure
    echo "{\"success\": false, \"message\": \"Script error: No spec file name provided\", \"reportPath\": \"\"}" > "${REPORT_BASE_DIR}/result.json"
    exit 1 # Script error
  fi
  SPEC_FILE_ARG="$1"
}

# --- Main Functions ---

# Lint the specified test file
lint_test() {
  local full_spec_path="${SPECS_DIR}/${SPEC_FILE_ARG}"
  log_message "Linting test file: ${full_spec_path}"

  if [[ ! -f "${full_spec_path}" ]]; then
    log_message "ERROR: Spec file not found at ${full_spec_path}"
    return 1 # Linting failed
  fi

  # Basic JavaScript syntax check using Node.js
  if node -c "${full_spec_path}"; then
    log_message "JavaScript syntax validation passed."
  else
    log_message "ERROR: JavaScript syntax validation failed."
    return 1 # Linting failed
  fi

  # Check for common Cypress patterns (simple heuristic)
  if ! grep -q -E "cy\.(get|visit|contains|click|type|should)" "${full_spec_path}"; then
    log_message "WARNING: No common Cypress commands (cy.get, cy.visit, etc.) found in spec. This might not be a valid Cypress test."
  fi
  if ! grep -q -E "describe\(|it\(" "${full_spec_path}"; then
    log_message "WARNING: No 'describe' or 'it' blocks found. This is unusual for a Cypress test."
  fi

  log_message "Linting completed."
  return 0 # Linting successful
}

# Run the Cypress test
run_test() {
  local full_spec_path="${SPECS_DIR}/${SPEC_FILE_ARG}"
  log_message "Starting Cypress test execution for: ${full_spec_path}"

  # Define report paths within the unique run directory
  local mochawesome_report_dir="${REPORT_BASE_DIR}/mochawesome"
  local junit_report_file="${REPORT_BASE_DIR}/junit/results.xml" # Path for JUnit XML
  local final_html_report_dir="${REPORT_BASE_DIR}" # Final merged HTML report
  local final_html_report_file="${final_html_report_dir}/mochawesome.html" # Default name by marge

  mkdir -p "${mochawesome_report_dir}"
  mkdir -p "$(dirname "${junit_report_file}")"

  # Environment variables for Cypress
  export CYPRESS_CACHE_FOLDER="${CYPRESS_CACHE_FOLDER}"
  export NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY}"
  # For running in headless environments, especially Docker
  export ELECTRON_EXTRA_LAUNCH_ARGS="--no-sandbox --disable-gpu --disable-dev-shm-usage"
  # Pass report directory to Cypress if needed via env var, though reporter options are preferred
  # export CYPRESS_REPORT_DIR="${mochawesome_report_dir}" # Example

  log_message "Executing Cypress command..."
  # Command to run Cypress tests.
  # xvfb-run is used for headless execution in environments without a display server.
  # --headless: Runs Cypress in headless mode.
  # --browser chrome: Specifies the browser (ensure it's installed in Docker).
  # --spec: Specifies the test file to run.
  # --reporter mochawesome: Uses the Mochawesome reporter.
  # --reporter-options: Configures the Mochawesome reporter.
  # --config: Overrides Cypress configuration options.
  local cypress_cmd
  cypress_cmd="npx cypress run \
    --headless \
    --browser chrome \
    --spec \"${full_spec_path}\" \
    --reporter mochawesome \
    --reporter-options \"reportDir=${mochawesome_report_dir},overwrite=false,html=false,json=true,charts=true,reportPageTitle='n8n QA Test Report - ${SPEC_FILE_ARG}',embeddedScreenshots=true,inlineAssets=true\" \
    --config \"screenshotsFolder=${REPORT_BASE_DIR}/screenshots,videosFolder=${REPORT_BASE_DIR}/videos,trashAssetsBeforeRuns=true,video=false\" \
    --config-file \"${CYPRESS_DIR}/cypress.json\""
  
  log_message "Cypress command: ${cypress_cmd}"

  local cypress_exit_code=0
  # Execute with timeout
  if timeout "${DEFAULT_TIMEOUT_SECONDS}s" xvfb-run --auto-servernum --server-args="-screen 0 1280x800x24" bash -c "${cypress_cmd}"; then
    log_message "Cypress execution completed successfully (exit code 0)."
    cypress_exit_code=0
  else
    cypress_exit_code=$?
    if [[ ${cypress_exit_code} -eq 124 ]]; then
      log_message "ERROR: Cypress execution timed out after ${DEFAULT_TIMEOUT_SECONDS} seconds."
    else
      log_message "ERROR: Cypress execution failed with exit code ${cypress_exit_code}."
    fi
  fi
  
  # --- Report Aggregation ---
  # Merge Mochawesome JSON reports (even if only one, this is good practice)
  local merged_json_report="${REPORT_BASE_DIR}/report.json"
  log_message "Merging Mochawesome reports to ${merged_json_report}..."
  if npx mochawesome-merge "${mochawesome_report_dir}/*.json" --ignore-empty --ignore-not-found -o "${merged_json_report}"; then
    log_message "Mochawesome reports merged successfully."
  else
    log_message "WARNING: Failed to merge Mochawesome reports. HTML report might be incomplete or missing."
    # Create a dummy merged report if merge fails, so marge doesn't fail
    echo "{}" > "${merged_json_report}"
  fi

  # Generate final HTML report from the merged JSON
  log_message "Generating final HTML report to ${final_html_report_dir}..."
  if npx marge "${merged_json_report}" -f "mochawesome" -o "${final_html_report_dir}" --inline --charts --timestamp "dd-mm-yyyy HH:MM:ss"; then
    log_message "Final HTML report generated successfully: ${final_html_report_file}"
  else
    log_message "ERROR: Failed to generate final HTML report with marge."
    # To ensure a report path is always available, even if empty
    touch "${final_html_report_file}" 
  fi
  
  # Generate JUnit XML report (optional, for CI systems)
  # This requires a library like mochawesome-junit-reporter or custom conversion.
  # For simplicity, if junit-viewer is installed and can convert mochawesome json:
  if command -v junit-viewer &> /dev/null && [ -f "${merged_json_report}" ]; then
    log_message "Generating JUnit XML report to ${junit_report_file}..."
    if npx junit-viewer --results="${merged_json_report}" --save="${junit_report_file}"; then
      log_message "JUnit XML report generated successfully."
    else
      log_message "WARNING: Failed to generate JUnit XML report."
    fi
  else
    log_message "junit-viewer not found or merged report missing, skipping JUnit XML generation."
  fi

  # --- Output for n8n ---
  # The result.json file communicates the outcome to n8n.
  # 'success' here means the script ran and tests were attempted.
  # The actual test pass/fail status is in the HTML report.
  local test_run_succeeded=true
  if [[ ${cypress_exit_code} -ne 0 ]]; then
    test_run_succeeded=false
  fi
  
  log_message "Creating result.json for n8n..."
  echo "{\"success\": ${test_run_succeeded}, \"reportPath\": \"${final_html_report_file}\", \"logPath\": \"${LOG_FILE_PATH}\", \"cypressExitCode\": ${cypress_exit_code}}" > "${REPORT_BASE_DIR}/result.json"
  
  # The script itself should exit 0 if it completed its tasks,
  # even if Cypress tests failed. The success/failure of tests is in the report.
  return 0
}

# --- Script Execution ---

# Setup: Ensure directories exist and parse arguments
# Do this before trap to ensure LOG_FILE_PATH is set for trap logging
setup_directories
parse_arguments "$@"

# Trap for cleanup on script exit
trap cleanup EXIT SIGINT SIGTERM

log_message "==== Cypress Runner Initialized ===="
log_message "Timestamp: ${TIMESTAMP}"
log_message "Report Base Directory: ${REPORT_BASE_DIR}"
log_message "Spec File Argument: ${SPEC_FILE_ARG}"
log_message "Dry Run: ${DRY_RUN}"
log_message "===================================="

# Main logic
if [ "${DRY_RUN}" = true ]; then
  log_message "Performing DRY RUN (lint only)..."
  if lint_test; then
    log_message "Dry run (lint) successful."
    echo "{\"success\": true, \"message\": \"Dry run (lint) successful for ${SPEC_FILE_ARG}\", \"reportPath\": \"\"}" > "${REPORT_BASE_DIR}/result.json"
    # Output the result.json content to stdout for n8n
    cat "${REPORT_BASE_DIR}/result.json"
    exit 0 # Script success
  else
    log_message "ERROR: Dry run (lint) failed for ${SPEC_FILE_ARG}."
    echo "{\"success\": false, \"message\": \"Dry run (lint) failed for ${SPEC_FILE_ARG}\", \"reportPath\": \"\"}" > "${REPORT_BASE_DIR}/result.json"
    # Output the result.json content to stdout for n8n
    cat "${REPORT_BASE_DIR}/result.json"
    exit 1 # Script error (lint failed)
  fi
else
  log_message "Performing FULL TEST EXECUTION for ${SPEC_FILE_ARG}..."
  # Step 1: Lint the test first
  if ! lint_test; then
    log_message "ERROR: Linting failed. Aborting test execution."
    echo "{\"success\": false, \"message\": \"Linting failed for ${SPEC_FILE_ARG}. Test execution aborted.\", \"reportPath\": \"\"}" > "${REPORT_BASE_DIR}/result.json"
    cat "${REPORT_BASE_DIR}/result.json"
    exit 1 # Script error (lint failed)
  fi
  
  log_message "Linting passed. Proceeding with test execution."
  # Step 2: Run the test
  if run_test; then
    log_message "Test execution process completed."
    # run_test creates result.json. Output its content to stdout for n8n.
    cat "${REPORT_BASE_DIR}/result.json"
    exit 0 # Script success (test execution attempted)
  else
    # This case should ideally not be reached if run_test always returns 0
    # and handles its errors by writing to result.json.
    # However, as a fallback for unexpected errors within run_test:
    log_message "ERROR: Test execution script encountered an unexpected error."
    echo "{\"success\": false, \"message\": \"Test execution script failed unexpectedly for ${SPEC_FILE_ARG}\", \"reportPath\": \"\"}" > "${REPORT_BASE_DIR}/result.json"
    cat "${REPORT_BASE_DIR}/result.json"
    exit 2 # Script error (unexpected)
  fi
fi
