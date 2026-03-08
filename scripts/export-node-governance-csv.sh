#!/bin/bash
# ============================================================================
# Node Governance CSV Export Script
# ============================================================================
# 
# This script exports Node Governance data to CSV files.
#
# Usage:
#   ./scripts/export-node-governance-csv.sh
#
# Environment variables (or edit defaults below):
#   DB_HOST     - PostgreSQL host (default: localhost)
#   DB_PORT     - PostgreSQL port (default: 5432)
#   DB_NAME     - Database name (default: n8n)
#   DB_USER     - Database user (default: n8n)
#   DB_PASSWORD - Database password
#   OUTPUT_DIR  - Output directory (default: ./governance-reports)
#
# ============================================================================

# Configuration - edit these or set environment variables
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-n8n}"
DB_USER="${DB_USER:-n8n}"
OUTPUT_DIR="${OUTPUT_DIR:-./governance-reports}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "============================================"
echo "Node Governance CSV Export"
echo "============================================"
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Output:   $OUTPUT_DIR"
echo "============================================"
echo ""

# Export Policies Report
echo "Exporting Policies Report..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\copy (
SELECT 
    p.id AS \"Policy ID\",
    p.\"policyType\" AS \"Policy Type\",
    p.scope AS \"Scope\",
    p.\"targetType\" AS \"Target Type\",
    p.\"targetValue\" AS \"Target Value\",
    CASE 
        WHEN p.\"targetType\" = 'category' THEN nc.\"displayName\"
        ELSE ''
    END AS \"Category Name\",
    CASE 
        WHEN p.\"targetType\" = 'node' THEN p.\"targetValue\"
        ELSE nca.\"nodeType\"
    END AS \"Node Type\",
    CASE WHEN p.\"policyType\" = 'allow' THEN 'Allowed' ELSE 'Blocked' END AS \"Status\",
    CASE 
        WHEN p.scope = 'global' THEN 'All (Global)'
        ELSE COALESCE(
            (SELECT STRING_AGG(proj.name, '; ' ORDER BY proj.name) 
             FROM policy_project_assignment ppa 
             JOIN project proj ON ppa.\"projectId\" = proj.id 
             WHERE ppa.\"policyId\" = p.id),
            'No projects assigned'
        )
    END AS \"Projects\",
    u.email AS \"Created By\",
    p.\"createdAt\" AS \"Created At\"
FROM node_governance_policy p
LEFT JOIN \"user\" u ON p.\"createdById\" = u.id
LEFT JOIN node_category nc ON p.\"targetType\" = 'category' AND nc.slug = p.\"targetValue\"
LEFT JOIN node_category_assignment nca ON p.\"targetType\" = 'category' AND nca.\"categoryId\" = nc.id
WHERE p.\"targetType\" = 'node' 
   OR (p.\"targetType\" = 'category' AND nca.\"nodeType\" IS NOT NULL)
ORDER BY p.id, \"Node Type\"
) TO '$OUTPUT_DIR/policies_${TIMESTAMP}.csv' WITH CSV HEADER"

if [ $? -eq 0 ]; then
    echo "  ✓ policies_${TIMESTAMP}.csv"
else
    echo "  ✗ Failed to export policies"
fi

# Export Categories Report
echo "Exporting Categories Report..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\copy (
SELECT 
    nc.id AS \"Category ID\",
    nc.slug AS \"Slug\",
    nc.\"displayName\" AS \"Display Name\",
    COALESCE(nc.description, '') AS \"Description\",
    COALESCE(nc.color, '') AS \"Color\",
    (SELECT COUNT(*) FROM node_category_assignment WHERE \"categoryId\" = nc.id) AS \"Node Count\",
    COALESCE(
        (SELECT STRING_AGG(\"nodeType\", '; ' ORDER BY \"nodeType\") 
         FROM node_category_assignment 
         WHERE \"categoryId\" = nc.id),
        ''
    ) AS \"Nodes\",
    u.email AS \"Created By\",
    nc.\"createdAt\" AS \"Created At\"
FROM node_category nc
LEFT JOIN \"user\" u ON nc.\"createdById\" = u.id
ORDER BY nc.\"displayName\"
) TO '$OUTPUT_DIR/categories_${TIMESTAMP}.csv' WITH CSV HEADER"

if [ $? -eq 0 ]; then
    echo "  ✓ categories_${TIMESTAMP}.csv"
else
    echo "  ✗ Failed to export categories"
fi

# Export Nodes Governance Status Report
echo "Exporting Nodes Governance Status Report..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\copy (
SELECT DISTINCT ON (nca.\"nodeType\", p.id)
    nca.\"nodeType\" AS \"Node Type\",
    nc.slug AS \"Category Slug\",
    nc.\"displayName\" AS \"Category Name\",
    COALESCE(p.id, '') AS \"Policy ID\",
    COALESCE(p.\"policyType\", 'default') AS \"Policy Type\",
    COALESCE(p.scope, '') AS \"Policy Scope\",
    CASE 
        WHEN p.\"policyType\" = 'allow' THEN 'Allowed'
        WHEN p.\"policyType\" = 'block' THEN 'Blocked'
        ELSE 'Allowed (Default)'
    END AS \"Status\",
    CASE 
        WHEN p.id IS NULL THEN 'All'
        WHEN p.scope = 'global' THEN 'All (Global)'
        ELSE COALESCE(
            (SELECT STRING_AGG(proj.name, '; ' ORDER BY proj.name) 
             FROM policy_project_assignment ppa 
             JOIN project proj ON ppa.\"projectId\" = proj.id 
             WHERE ppa.\"policyId\" = p.id),
            'No projects assigned'
        )
    END AS \"Projects\"
FROM node_category_assignment nca
JOIN node_category nc ON nca.\"categoryId\" = nc.id
LEFT JOIN node_governance_policy p ON (
    (p.\"targetType\" = 'node' AND p.\"targetValue\" = nca.\"nodeType\")
    OR (p.\"targetType\" = 'category' AND p.\"targetValue\" = nc.slug)
)
ORDER BY nca.\"nodeType\", p.id
) TO '$OUTPUT_DIR/nodes_governance_${TIMESTAMP}.csv' WITH CSV HEADER"

if [ $? -eq 0 ]; then
    echo "  ✓ nodes_governance_${TIMESTAMP}.csv"
else
    echo "  ✗ Failed to export nodes governance"
fi

# Export Access Requests Report
echo "Exporting Access Requests Report..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\copy (
SELECT 
    nar.id AS \"Request ID\",
    nar.\"nodeType\" AS \"Node Type\",
    nar.status AS \"Status\",
    nar.justification AS \"Justification\",
    nar.\"workflowName\" AS \"Workflow Name\",
    p.name AS \"Project\",
    req.email AS \"Requested By\",
    nar.\"createdAt\" AS \"Requested At\",
    rev.email AS \"Reviewed By\",
    nar.\"reviewComment\" AS \"Review Comment\",
    nar.\"reviewedAt\" AS \"Reviewed At\"
FROM node_access_request nar
JOIN project p ON nar.\"projectId\" = p.id
JOIN \"user\" req ON nar.\"requestedById\" = req.id
LEFT JOIN \"user\" rev ON nar.\"reviewedById\" = rev.id
ORDER BY nar.\"createdAt\" DESC
) TO '$OUTPUT_DIR/access_requests_${TIMESTAMP}.csv' WITH CSV HEADER"

if [ $? -eq 0 ]; then
    echo "  ✓ access_requests_${TIMESTAMP}.csv"
else
    echo "  ✗ Failed to export access requests"
fi

echo ""
echo "============================================"
echo "Export Complete!"
echo "============================================"
echo "Files saved to: $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR"/*_${TIMESTAMP}.csv 2>/dev/null
echo ""
