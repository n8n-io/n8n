#!/bin/bash
# ============================================================================
# Node Governance Full JSON Backup Script
# ============================================================================
# Exports all 5 governance tables to a single JSON file for backup/restore.
#
# Usage:
#   ./scripts/backup-node-governance-json.sh
#
# Environment variables:
#   DB_HOST     - PostgreSQL host (default: localhost)
#   DB_PORT     - PostgreSQL port (default: 5432)
#   DB_NAME     - Database name (default: n8n)
#   DB_USER     - Database user (default: n8n)
#   DB_PASSWORD - Database password
#   OUTPUT_FILE - Output file (default: .backup-config/node-governance-full-backup.json)
# ============================================================================

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-n8n}"
DB_USER="${DB_USER:-n8n}"
OUTPUT_FILE="${OUTPUT_FILE:-.backup-config/node-governance-full-backup.json}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Exporting Node Governance data to JSON..."
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"

POLICIES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, \"policyType\", scope, \"targetType\", \"targetValue\", \"createdById\", \"createdAt\", \"updatedAt\"
  FROM node_governance_policy ORDER BY id
) t;
" 2>/dev/null)

PROJECT_ASSIGNMENTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, \"policyId\", \"projectId\", \"createdAt\", \"updatedAt\"
  FROM policy_project_assignment ORDER BY id
) t;
" 2>/dev/null)

CATEGORIES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, slug, \"displayName\", description, color, \"createdById\", \"createdAt\", \"updatedAt\"
  FROM node_category ORDER BY slug
) t;
" 2>/dev/null)

CATEGORY_ASSIGNMENTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, \"categoryId\", \"nodeType\", \"assignedById\", \"createdAt\", \"updatedAt\"
  FROM node_category_assignment ORDER BY \"categoryId\", \"nodeType\"
) t;
" 2>/dev/null)

ACCESS_REQUESTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, \"projectId\", \"requestedById\", \"nodeType\", justification, \"workflowName\",
         status, \"reviewedById\", \"reviewComment\", \"reviewedAt\", \"createdAt\", \"updatedAt\"
  FROM node_access_request ORDER BY \"createdAt\" DESC
) t;
" 2>/dev/null)

# Handle null results (empty tables)
[ "$POLICIES" = "" ] || [ "$POLICIES" = "null" ] && POLICIES="[]"
[ "$PROJECT_ASSIGNMENTS" = "" ] || [ "$PROJECT_ASSIGNMENTS" = "null" ] && PROJECT_ASSIGNMENTS="[]"
[ "$CATEGORIES" = "" ] || [ "$CATEGORIES" = "null" ] && CATEGORIES="[]"
[ "$CATEGORY_ASSIGNMENTS" = "" ] || [ "$CATEGORY_ASSIGNMENTS" = "null" ] && CATEGORY_ASSIGNMENTS="[]"
[ "$ACCESS_REQUESTS" = "" ] || [ "$ACCESS_REQUESTS" = "null" ] && ACCESS_REQUESTS="[]"

cat > "$OUTPUT_FILE" << JSONEOF
{
  "_meta": {
    "exportedAt": "$TIMESTAMP",
    "source": "$DB_HOST:$DB_PORT/$DB_NAME",
    "version": "pre-merge-2.10.4",
    "tables": ["node_governance_policy", "policy_project_assignment", "node_category", "node_category_assignment", "node_access_request"]
  },
  "policies": $POLICIES,
  "policyProjectAssignments": $PROJECT_ASSIGNMENTS,
  "categories": $CATEGORIES,
  "categoryAssignments": $CATEGORY_ASSIGNMENTS,
  "accessRequests": $ACCESS_REQUESTS
}
JSONEOF

if [ $? -eq 0 ]; then
    echo "Backup saved to: $OUTPUT_FILE"
    echo "Records:"
    echo "  Policies:             $(echo "$POLICIES" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
    echo "  Project Assignments:  $(echo "$PROJECT_ASSIGNMENTS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
    echo "  Categories:           $(echo "$CATEGORIES" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
    echo "  Category Assignments: $(echo "$CATEGORY_ASSIGNMENTS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
    echo "  Access Requests:      $(echo "$ACCESS_REQUESTS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 'N/A')"
else
    echo "ERROR: Failed to create backup file"
    exit 1
fi
