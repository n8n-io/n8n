-- Node Governance Seed Data
-- This script seeds sample data for testing the Node Governance feature
-- Compatible with SQLite, PostgreSQL, and MySQL

-- ============================================================================
-- Categories
-- ============================================================================

-- Insert sample categories
INSERT INTO node_category (id, name, description, "createdAt", "updatedAt")
VALUES 
    ('cat_external_01', 'External Services', 'Nodes that connect to external third-party services', datetime('now'), datetime('now')),
    ('cat_database_01', 'Database Operations', 'Nodes for database read/write operations', datetime('now'), datetime('now')),
    ('cat_filesystem_01', 'File System', 'Nodes that access the local file system', datetime('now'), datetime('now')),
    ('cat_network_01', 'Network & SSH', 'Nodes for network operations and SSH connections', datetime('now'), datetime('now')),
    ('cat_code_exec_01', 'Code Execution', 'Nodes that execute arbitrary code', datetime('now'), datetime('now'));

-- ============================================================================
-- Category Assignments (Assign nodes to categories)
-- ============================================================================

-- External Services
INSERT INTO node_category_assignment (nodeType, categoryId)
VALUES 
    ('n8n-nodes-base.httpRequest', 'cat_external_01'),
    ('n8n-nodes-base.webhook', 'cat_external_01'),
    ('n8n-nodes-base.slack', 'cat_external_01'),
    ('n8n-nodes-base.gmail', 'cat_external_01'),
    ('n8n-nodes-base.googleSheets', 'cat_external_01'),
    ('n8n-nodes-base.microsoftTeams', 'cat_external_01');

-- Database Operations
INSERT INTO node_category_assignment (nodeType, categoryId)
VALUES 
    ('n8n-nodes-base.postgres', 'cat_database_01'),
    ('n8n-nodes-base.mysql', 'cat_database_01'),
    ('n8n-nodes-base.mongodb', 'cat_database_01'),
    ('n8n-nodes-base.redis', 'cat_database_01'),
    ('n8n-nodes-base.mssql', 'cat_database_01');

-- File System
INSERT INTO node_category_assignment (nodeType, categoryId)
VALUES 
    ('n8n-nodes-base.readWriteFile', 'cat_filesystem_01'),
    ('n8n-nodes-base.localFileTrigger', 'cat_filesystem_01'),
    ('n8n-nodes-base.ftp', 'cat_filesystem_01'),
    ('n8n-nodes-base.sftp', 'cat_filesystem_01');

-- Network & SSH
INSERT INTO node_category_assignment (nodeType, categoryId)
VALUES 
    ('n8n-nodes-base.ssh', 'cat_network_01'),
    ('n8n-nodes-base.executeCommand', 'cat_network_01');

-- Code Execution
INSERT INTO node_category_assignment (nodeType, categoryId)
VALUES 
    ('n8n-nodes-base.code', 'cat_code_exec_01'),
    ('n8n-nodes-base.function', 'cat_code_exec_01'),
    ('n8n-nodes-base.functionItem', 'cat_code_exec_01');

-- ============================================================================
-- Policies
-- ============================================================================

-- Global Block Policies (highest priority)
INSERT INTO node_governance_policy (id, name, nodeType, action, "isGlobal", categoryId, "createdAt", "updatedAt")
VALUES 
    ('pol_ssh_block_01', 'Block SSH Node Globally', 'n8n-nodes-base.ssh', 'block', 1, NULL, datetime('now'), datetime('now')),
    ('pol_exec_block_01', 'Block Execute Command Globally', 'n8n-nodes-base.executeCommand', 'block', 1, NULL, datetime('now'), datetime('now'));

-- Global Allow Policies
INSERT INTO node_governance_policy (id, name, nodeType, action, "isGlobal", categoryId, "createdAt", "updatedAt")
VALUES 
    ('pol_http_allow_01', 'Allow HTTP Request Globally', 'n8n-nodes-base.httpRequest', 'allow', 1, NULL, datetime('now'), datetime('now')),
    ('pol_slack_allow_01', 'Allow Slack Globally', 'n8n-nodes-base.slack', 'allow', 1, NULL, datetime('now'), datetime('now')),
    ('pol_gmail_allow_01', 'Allow Gmail Globally', 'n8n-nodes-base.gmail', 'allow', 1, NULL, datetime('now'), datetime('now'));

-- Category-based Block Policy
INSERT INTO node_governance_policy (id, name, nodeType, action, "isGlobal", categoryId, "createdAt", "updatedAt")
VALUES 
    ('pol_code_block_01', 'Block Code Execution Category', '*', 'block', 1, 'cat_code_exec_01', datetime('now'), datetime('now'));

-- ============================================================================
-- Summary of Seed Data
-- ============================================================================
-- Categories: 5 categories for organizing nodes
-- Category Assignments: 20+ node-to-category mappings
-- Policies:
--   - 2 Global Block policies (SSH, Execute Command)
--   - 3 Global Allow policies (HTTP Request, Slack, Gmail)
--   - 1 Category-based Block policy (Code Execution category)
--
-- Expected behavior after seeding:
--   - SSH and Execute Command nodes: BLOCKED globally
--   - Code, Function, FunctionItem nodes: BLOCKED (via category)
--   - HTTP Request, Slack, Gmail: ALLOWED explicitly
--   - Other nodes: ALLOWED by default (no policy = allowed)
-- ============================================================================
