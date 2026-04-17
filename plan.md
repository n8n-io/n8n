# Plan: n8n Plugin for Claude — Implementation Plan

## 1. Overview

Build a Claude plugin that connects Claude (Code and claude.ai) to a user's
n8n instance via n8n's existing MCP server. The plugin bundles the remote MCP
connection, skills for common workflows, and agents for specialized tasks into
a single installable package — similar to how the Figma plugin bundles its MCP
connection with design-to-code skills.

**Goal:** Let users say things like _"Build me a workflow that sends Slack
notifications when a GitHub issue is created"_ or _"Run my Daily Report
workflow"_ directly inside Claude, with Claude orchestrating n8n's MCP tools
behind the scenes.

---

## 2. What Already Exists

n8n ships a production-grade MCP server in
`packages/cli/src/modules/mcp/`. It already provides:

| Capability | Details |
|---|---|
| **Transport** | Streamable HTTP at `POST /mcp-server/http` |
| **Auth discovery** | `HEAD /mcp-server/http` returns `WWW-Authenticate` per RFC 6750 |
| **Auth** | OAuth 2.0 (authorization codes, access/refresh tokens, user consent) + API key auth |
| **25 tools** | Workflow search, execution, builder, data tables, validation |
| **MCP resource** | `n8n://workflow-sdk/reference` — SDK docs as a directly-addressable resource |
| **Instructions** | Conditional system prompt (intro only, or intro + 9-step builder guide) |
| **Rate limit** | 100 req/endpoint |
| **Queue mode** | Supported — MCP executions flow through n8n's worker queue |
| **Telemetry** | Connection + tool invocation tracking |
| **CORS** | `Access-Control-Allow-Origin: *` (wildcard — works with claude.ai) |

The plugin does **not** reimplement any of this. It connects to the existing
MCP server as a remote server and layers skills, agents, and UX on top.

---

## 3. Plugin vs Raw MCP Server — What the Plugin Adds

A user can already connect to n8n's MCP server manually by adding the URL
to their `.mcp.json`. Claude sees all 25 tools and the built-in MCP
instructions, and it works. So what does the plugin actually add?

### What the raw MCP server already provides (without a plugin)

- All 25 tools available to Claude
- OAuth authentication flow
- Built-in instructions (via MCP `InitializeResult.instructions`) that
  guide Claude through the workflow build flow
- Full functionality — everything works

### What the plugin adds on top

| Plugin Feature | What it gives you |
|---|---|
| **Marketplace listing** | Discoverability. Users find "n8n" by browsing claude.com/plugins instead of needing to know the MCP URL and manually configure it |
| **One-click install** | No manual JSON editing. `/plugin install n8n` vs hand-editing `.mcp.json` with the correct URL and auth config |
| **`userConfig` prompt** | Clean UX for entering the instance URL at enable time — the plugin prompts for it instead of the user editing config files |
| **Skills (slash commands)** | User-invocable shortcuts like `/n8n:build-workflow`. Explicit entry points the user can trigger vs relying on Claude to pick up the MCP instructions contextually |
| **Agents** | Dedicated subagents with constrained tool sets and tuned system prompts. Useful for complex multi-step tasks (building, debugging) that benefit from context isolation |
| **Monitors** | Background pollers that notify Claude when long-running executions finish. Impossible with raw MCP alone — this is proactive, not request/response |
| **Output styles** | Renders nested execution JSON as a compact per-node summary table instead of a wall of text |
| **Auto-updates** | Version management via marketplace. Users get new skills/agents automatically when the plugin is updated |
| **Bundled documentation** | README, setup guides, and troubleshooting in one package |

### Where the value really is

The **primary value** is distribution and discoverability on Claude's
side of the boundary. On n8n's side, there is already a guided MCP
setup flow:
`packages/frontend/editor-ui/src/features/ai/mcpAccess/` ships
`SettingsMCPView.vue`, `McpConnectPopover.vue`,
`MCPOAuthPopoverTab.vue`, and `MCPAccessTokenPopoverTab.vue`. The
access-token tab even generates a ready-to-copy `.mcp.json` snippet.
So the plugin is not moving users from "impossible" to "possible" —
it's moving them from "guided n8n-side setup" to "discoverable
Claude-side install."

The **secondary value** is UX polish — `userConfig` prompts, slash
commands as explicit entry points, and agents that isolate complex
multi-step tasks into their own context.

The **real capability gap** MCP can't fill on its own is the
**execution-status monitor**. MCP is request/response; it can't wake
Claude up when an async workflow finishes. The plugin ships that as
infrastructure (Claude Code only).

For **power users** who already know how to configure MCP servers, the
plugin adds the monitor plus curated skills — not just marketplace
polish. For **mainstream users** who start on Claude.ai, the plugin
shortens a multi-step setup to a one-click install.

---

## 4. Plugin Directory Structure

```
n8n-plugin/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest
│   └── marketplace.json         # Marketplace listing (for repo distribution)
├── skills/
│   ├── build-workflow/SKILL.md      # /n8n:build-workflow
│   ├── run-workflow/SKILL.md        # /n8n:run-workflow (live execution)
│   ├── test-workflow/SKILL.md       # /n8n:test-workflow (pinned data)
│   ├── publish-workflow/SKILL.md    # /n8n:publish-workflow
│   ├── update-workflow/SKILL.md     # /n8n:update-workflow
│   ├── debug-execution/SKILL.md     # /n8n:debug-execution
│   ├── list-workflows/SKILL.md      # /n8n:list-workflows
│   └── manage-data-table/SKILL.md   # /n8n:manage-data-table
├── agents/
│   ├── workflow-builder.md      # Specialized builder agent (builder tools only)
│   └── workflow-debugger.md     # Specialized debugger agent
├── monitors/
│   └── monitors.json            # Watch long-running executions → notify
├── output-styles/
│   └── execution-result.md      # Per-node execution output renderer
├── .mcp.json                    # Remote MCP server connection
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## 5. Plugin Manifest

**`.claude-plugin/plugin.json`**

```json
{
  "name": "n8n",
  "description": "Build, run, and manage n8n workflow automations from Claude",
  "version": "1.0.0",
  "author": {
    "name": "n8n GmbH",
    "email": "support@n8n.io"
  },
  "homepage": "https://n8n.io",
  "repository": "https://github.com/n8n-io/n8n-claude-plugin",
  "license": "SEE LICENSE IN LICENSE",
  "keywords": [
    "n8n",
    "workflow",
    "automation",
    "integration",
    "mcp",
    "workflow-builder"
  ],
  "userConfig": {
    "n8n_instance_url": {
      "type": "string",
      "title": "n8n instance URL",
      "description": "Your n8n instance URL without trailing slash (e.g., https://acme.n8n.cloud). For self-hosted instances behind a path prefix, include the prefix here.",
      "sensitive": false
    },
    "n8n_public_api_key": {
      "type": "string",
      "title": "n8n Public API key (optional — enables monitor)",
      "description": "Optional. n8n Public API key (not an MCP API key — create one under Settings → API in n8n). Only needed to enable the background execution-status monitor (Claude Code only). Requires at least the execution:read scope. Leave blank for OAuth-only use.",
      "sensitive": true
    },
    "n8n_public_api_path": {
      "type": "string",
      "title": "n8n Public API path override (optional)",
      "description": "Optional. Override the public API path if your instance sets N8N_PUBLIC_API_ENDPOINT to something other than 'api'. Leave blank to auto-detect.",
      "sensitive": false
    }
  }
}
```

### userConfig fields

Two fields, only one required:

| Field | Required | Purpose |
|---|---|---|
| `n8n_instance_url` | **yes** | Target n8n instance. Drives the MCP URL and the public API base. |
| `n8n_public_api_key` | optional | Unlocks the execution-status monitor. OAuth alone is enough for every skill/agent — the monitor is the only thing that needs it because it hits n8n's Public API directly. See §9a.1. |
| `n8n_public_api_path` | optional | Manual override of the public API path if auto-detection fails (e.g. instances with `N8N_PUBLIC_API_ENDPOINT` set to a non-default value). |

Values are stored in `settings.json` under `pluginConfigs[n8n].options`
and available as `${user_config.KEY}` in `.mcp.json`/skill content and
as `CLAUDE_PLUGIN_OPTION_*` env vars in subprocesses (non-sensitive
only — `n8n_api_key` lives in the system keychain and is exposed to
the monitor binary via a keychain-backed lookup rather than env).

**Schema.** Per-field keys confirmed by `claude plugin validate`:
`type` (`"string" | "number" | "boolean" | "directory" | "file"` —
required), `title` (required string), `description` (string),
`sensitive` (boolean). No built-in `default`, regex validation, or
format checks — validation at first use (skills check the URL
before issuing any tool call).

**Path prefixes.** Self-hosted deployments behind a reverse proxy
(e.g. `https://intranet.acme.com/n8n`) should include the prefix in the
URL so the computed `${url}/mcp-server/http` resolves correctly.

Authentication for the MCP session is handled by the server's built-in
OAuth flow — the user authorizes Claude through their n8n instance when
the MCP connection is first established.

---

## 6. MCP Server Connection

**`.mcp.json`**

The plugin connects to the user's n8n instance as a **remote** MCP server.
No local server binary is bundled — the MCP server already runs inside n8n.

```json
{
  "mcpServers": {
    "n8n": {
      "type": "http",
      "url": "${user_config.n8n_instance_url}/mcp-server/http"
    }
  }
}
```

The `type: "http"` field is **required** for remote MCP servers in a
plugin's `.mcp.json`; without it the loader defaults to stdio and the
connection fails. n8n's transport is Streamable HTTP, which is served
by the `http` transport type (no separate SSE endpoint is needed — the
server upgrades to a streaming response when appropriate).

### Authentication Flow

1. User enables the n8n plugin in Claude
2. Claude prompts for the n8n instance URL (via `userConfig`)
3. Claude probes `HEAD /mcp-server/http` to discover the auth scheme
   (RFC 6750 `WWW-Authenticate` header)
4. On first MCP tool invocation, the remote MCP server initiates OAuth
5. User authorizes Claude in their n8n instance (consent screen)
6. OAuth tokens are managed automatically (refresh, etc.)

### Reachability Requirements

| Context | Requirement |
|---|---|
| **Claude Code** (local) | The user's machine must reach the n8n instance. `http://localhost:5678` works. |
| **claude.ai** (remote) | Anthropic's servers must reach the n8n instance. Requires public DNS + valid TLS cert. n8n Cloud works out of the box. Localhost does NOT work. |

The plugin's README and `/n8n:build-workflow` skill should surface this
early — the #1 expected support question is "why does it work in Claude
Code but not on claude.ai?"

### What This Exposes to Claude

All 25 MCP tools from n8n become available, grouped by category:

**Workflow Discovery (read-only):**
- `search_workflows` — Find workflows by name, project, or status
- `search_projects` — Navigate projects
- `search_folders` — Navigate folders within projects
- `get_workflow_details` — Inspect nodes, connections, triggers

**Workflow Execution:**
- `execute_workflow` — Run a workflow (manual or production mode)
- `get_execution` — Check execution results, errors, node outputs
- `test_workflow` — Test with pin data (bypass external services)
- `prepare_test_pin_data` — Generate test data schemas

**Workflow Lifecycle:**
- `publish_workflow` — Activate for production
- `unpublish_workflow` — Deactivate
- `archive_workflow` — Archive

**Workflow Builder (when `N8N_MCP_BUILDER_ENABLED=true`):**
- `get_sdk_reference` — SDK documentation
- `search_nodes` — Find available nodes/integrations
- `get_node_types` — TypeScript type definitions for nodes
- `get_suggested_nodes` — Category-based node recommendations
- `validate_workflow` — Validate SDK code
- `create_workflow_from_code` — Create from validated code
- `update_workflow` — Modify existing workflow

**Data Tables:**
- `search_data_tables` — Find data tables
- `create_data_table` — Create with columns
- `add_data_table_rows` — Insert rows (max 1000/call)
- `rename_data_table`, `add_data_table_column`,
  `delete_data_table_column`, `rename_data_table_column`

---

## 7. Complete MCP Tool Inventory

These are the 25 tools exposed by n8n's MCP server. The plugin surfaces
all of them — skills and agents orchestrate them, but users can also
invoke them directly through Claude.

### 7.1 Workflow Search & Discovery (Read-Only)

#### `search_workflows`
- **Description:** Search for workflows with optional filters
- **Input:** `{ limit?: number (max 200), query?: string, projectId?: string }`
- **Output:** `{ data: [{ id, name, description, active, createdAt, updatedAt, triggerCount, scopes, canExecute, availableInMCP }], count: number }`
- **Annotations:** readOnlyHint: true, destructiveHint: false, idempotentHint: true
- **⚠ `availableInMCP` is returned but NOT filtered.** Every
  workflow-action tool (`execute_workflow`, `get_workflow_details`,
  `publish_workflow`, `test_workflow`, `update_workflow`) rejects
  workflows with `availableInMCP: false` via `getMcpWorkflow()` in
  `workflow-validation.utils.ts`. Skills must filter or warn.

#### `get_workflow_details`
- **Description:** Get detailed workflow info including triggers, nodes, and webhook endpoints
- **Input:** `{ workflowId: string }`
- **Output:** `{ workflow: { nodes (draft!), activeVersion, tags, meta, connections }, triggerInfo: { ...trigger details } }`
- **Annotations:** readOnlyHint: true, idempotentHint: true
- **⚠ `triggerInfo` is computed from DRAFT `workflow.nodes`, not
  `activeVersion.nodes`.** `execute_workflow` in `production` mode runs
  `activeVersion`. If the user edited the draft to a different trigger
  since last publish, the two disagree. Skills that call
  `get_workflow_details` → `execute_workflow` must either force
  `executionMode: 'manual'` or use `activeVersion` as source of truth
  for production runs.

### 7.2 Workflow Execution

#### `execute_workflow`
- **Description:** Execute a workflow by ID, returns execution ID immediately
- **Input:**
  ```json
  {
    "workflowId": "string",
    "executionMode": "'manual' | 'production' (default: 'production')",
    "inputs": {
      "type": "'chat' | 'form' | 'webhook'",
      "chatInput": "string (optional)",
      "formData": "Record<string, unknown> (optional)",
      "webhookData": "{ method, query, body, headers } (optional)"
    }
  }
  ```
- **Output:** `{ executionId: string | null, status: 'started' | 'error', error?: string }`
- **Supported triggers:** Manual, Schedule, Webhook, Chat, Form (production mode excludes manual)
- **⚠ Default mode is `production`.** A manual-only workflow will fail
  unless the caller sets `executionMode: 'manual'`. Skills must detect
  manual-only triggers and switch mode accordingly.
- **⚠ Multi-trigger workflows cannot be disambiguated via MCP.**
  `findMcpSupportedTrigger()` in `mcp.utils.ts` silently picks the
  first supported trigger, and `execute_workflow` has no
  `triggerNodeName` parameter. Skills must refuse multi-trigger
  workflows (counted on the node set the chosen `executionMode` will
  actually run — draft for `manual`, `activeVersion` for
  `production`) rather than pretending to offer a selector the tool
  doesn't support.
- **Annotations:** destructiveHint: true, openWorldHint: true (can execute external integrations)

#### `get_execution`
- **Description:** Get execution details by execution & workflow ID
- **Input:** `{ workflowId: string, executionId: string, includeData?: boolean, nodeNames?: string[], truncateData?: number }`
- **Output:** `{ execution: { ...metadata }, data?: IRunExecutionData, error?: string }`
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `test_workflow`
- **Description:** Test a workflow using pin data to bypass external services
- **Input:** `{ workflowId: string, pinData: Record<string, Array<Record<string, unknown>>>, triggerNodeName?: string }`
- **Output:** `{ executionId: string | null, status: 'success' | 'error' | 'running' | 'waiting' | 'canceled' | 'crashed' | 'new' | 'unknown', error?: string }`
- **Behavior:** Trigger nodes, credential nodes, HTTP Request nodes are pinned; logic nodes (Set, If, Code) and credential-free I/O execute normally
- **⚠ Destructive in practice:** Execute Command, file-write, and Code nodes run for real even with pin data. Skills and agents that invoke `test_workflow` should surface this before execution.
- **Timeout:** 5 minutes
- **Annotations:** destructiveHint: true, idempotentHint: false

#### `prepare_test_pin_data`
- **Description:** Prepare test pin data schemas for a workflow
- **Input:** `{ workflowId: string }`
- **Output:** `{ nodeSchemasToGenerate, nodesWithoutSchema, nodesSkipped, coverage: { withSchemaFromExecution, withSchemaFromDefinition, withoutSchema, skipped, total } }`
- **Annotations:** readOnlyHint: true, idempotentHint: true

### 7.3 Workflow Lifecycle

#### `publish_workflow`
- **Description:** Publish (activate) a workflow for production execution
- **Input:** `{ workflowId: string, versionId?: string }`
- **Output:** `{ success: boolean, workflowId: string, activeVersionId: string | null, error?: string }`
- **⚠ Does NOT return webhook URLs.** Skills that want to show the
  webhook URL must make a follow-up `get_workflow_details` call.
- **Annotations:** idempotentHint: true

#### `unpublish_workflow`
- **Description:** Unpublish (deactivate) a workflow to stop production execution
- **Input:** `{ workflowId: string }`
- **Output:** `{ success: boolean, workflowId: string, error?: string }`
- **Annotations:** idempotentHint: true

### 7.4 Workflow Builder & Project Discovery (requires `N8N_MCP_BUILDER_ENABLED=true`)

Ten tools total. The builder flag also gates `search_projects` and
`search_folders` — they are **not** always-on discovery tools.
`registerBuilderTools()` in `mcp.service.ts` registers them alongside
the code-authoring tools.

#### `search_projects`
- **Description:** Search projects accessible to the user
- **Input:** `{ query?: string, type?: 'personal' | 'team', limit?: number (max 100) }`
- **Output:** `{ data: [{ id, name, type }], count: number }`
- **Annotations:** readOnlyHint: true, idempotentHint: true
- **Required by:** `create_data_table` (needs `projectId`), `create_workflow_from_code` (optional)

#### `search_folders`
- **Description:** Search folders within a project
- **Input:** `{ projectId: string, query?: string, limit?: number (max 100) }`
- **Output:** `{ data: [{ id, name, parentFolderId }], count: number }`
- **Annotations:** readOnlyHint: true, idempotentHint: true
- **Requires:** `folder:list` scope on the target project

#### `get_sdk_reference`
- **Tool constant:** `MCP_GET_SDK_REFERENCE_TOOL` (`get_sdk_reference`)
- **Description:** Get n8n Workflow SDK reference documentation
- **Input:** `{ section?: 'patterns' | 'expressions' | 'functions' | 'rules' | 'import' | 'guidelines' | 'design' | 'all' }`
- **Output:** `{ reference: string }`
- **Also available as MCP resource:** `n8n://workflow-sdk/reference`
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `search_nodes`
- **Tool constant:** `CODE_BUILDER_SEARCH_NODES_TOOL` (`search_nodes`)
- **Description:** Search n8n nodes by service name, trigger type, or utility
- **Input:** `{ queries: string[] }` (e.g., `["gmail", "slack", "schedule trigger", "set"]`)
- **Output:** `{ results: string }` (text with node IDs and discriminators)
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `get_node_types`
- **Tool constant:** `CODE_BUILDER_GET_NODE_TYPES_TOOL` (`get_node_types`)
- **Description:** Get TypeScript type definitions for nodes
- **Input:** `{ nodeIds: (string | { nodeId, version?, resource?, operation?, mode? })[] }`
- **Output:** `{ definitions: string }` (TypeScript type definitions)
- **Critical:** Must be called before writing code — parameter names must match exactly
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `get_suggested_nodes`
- **Tool constant:** `CODE_BUILDER_GET_SUGGESTED_NODES_TOOL` (`get_suggested_nodes`)
- **Description:** Get curated node recommendations by workflow category
- **Input:** `{ categories: string[] }`
- **Available categories:** chatbot, notification, scheduling, data_transformation, data_persistence, data_extraction, document_processing, form_input, content_generation, triage, scraping_and_research
- **Output:** `{ suggestions: string }`
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `validate_workflow`
- **Tool constant:** `CODE_BUILDER_VALIDATE_TOOL` (`validate_workflow`)
- **Description:** Validate n8n Workflow SDK code
- **Input:** `{ code: string }`
- **Output:** `{ valid: boolean, nodeCount?: number, warnings?: [{ code, message, nodeName?, parameterPath? }], errors?: string[], hint?: string }`
- **Annotations:** readOnlyHint: true, idempotentHint: true

#### `create_workflow_from_code`
- **Tool constant:** `MCP_CREATE_WORKFLOW_FROM_CODE_TOOL` (`create_workflow_from_code`)
- **Description:** Create a workflow from validated SDK code
- **Input:** `{ code: string, name?: string, description?: string, projectId?: string, folderId?: string }`
- **Output:** `{ workflowId: string, name: string, nodeCount: number, url: string, autoAssignedCredentials: [{ nodeName, credentialName }], note?: string, hint?: string }`
- **Must call** `validate_workflow` first

#### `update_workflow`
- **Tool constant:** `MCP_UPDATE_WORKFLOW_TOOL` (`update_workflow`)
- **Description:** Update an existing workflow from validated SDK code
- **Input:** `{ workflowId: string, code: string, name?: string, description?: string }`
- **Output:** `{ workflowId: string, name: string, nodeCount: number, url: string, autoAssignedCredentials: [...], note?: string, hint?: string }`
- **Must call** `validate_workflow` first
- **Annotations:** destructiveHint: true, idempotentHint: true

#### `archive_workflow`
- **Tool constant:** `MCP_ARCHIVE_WORKFLOW_TOOL` (`archive_workflow`)
- **Description:** Archive a workflow
- **Input:** `{ workflowId: string }`
- **Output:** `{ archived: boolean, workflowId: string, name: string }`
- **Annotations:** destructiveHint: true, idempotentHint: true

### 7.5 Data Tables

#### `search_data_tables`
- **Description:** Search data tables accessible to the user
- **Input:** `{ query?: string, projectId?: string, limit?: number (max 100) }`
- **Output:** `{ data: [{ id, name, projectId, createdAt, updatedAt, columns: [{ id, name, type, index }] }], count: number }`
- **Annotations:** readOnlyHint: true

#### `create_data_table`
- **Description:** Create a new data table with columns
- **Input:** `{ projectId: string, name: string, columns: [{ name: string, type: 'string' | 'number' | 'boolean' | 'date' }] }`
- **Output:** `{ id: string, name: string, projectId: string }`
- **Minimum 1 column required**

#### `rename_data_table`
- **Description:** Rename an existing data table
- **Input:** `{ dataTableId: string, projectId: string, name: string }`
- **Output:** `{ success: boolean, message: string }`

#### `add_data_table_column`
- **Description:** Add a column to a data table
- **Input:** `{ dataTableId: string, projectId: string, name: string, type: 'string' | 'number' | 'boolean' | 'date' }`
- **Output:** `{ success: boolean, message: string, column: { id, name, type } }`

#### `delete_data_table_column`
- **Description:** Delete a column from a data table (permanent)
- **Input:** `{ dataTableId: string, projectId: string, columnId: string }`
- **Output:** `{ success: boolean, message: string }`
- **Annotations:** destructiveHint: true

#### `rename_data_table_column`
- **Description:** Rename a column in a data table
- **Input:** `{ dataTableId: string, projectId: string, columnId: string, name: string }`
- **Output:** `{ success: boolean, message: string, column: { id, name, type } }`

#### `add_data_table_rows`
- **Description:** Insert rows into a data table
- **Input:** `{ dataTableId: string, projectId: string, rows: Array<Record<columnName, value>> }`
- **Output:** `{ success: boolean, insertedCount: number }`
- **Max 1000 rows per call**

### 7.6 MCP Server Built-in Instructions

When the MCP connection is initialized, n8n returns instructions via
`InitializeResult.instructions`. The text is **conditional on whether
the builder tools are enabled** (see `mcp-instructions.ts`).

**Always returned (intro):**

```
This is the official MCP server for n8n, a workflow automation platform.
```

**Appended only when `N8N_MCP_BUILDER_ENABLED=true` (the default):**

```
This MCP server provides tools to build n8n workflows programmatically
using the n8n Workflow SDK.

To build n8n workflows, follow these steps in order:

1. Read the SDK reference: Call get_sdk_reference (or use the
   n8n://workflow-sdk/reference resource) to learn the SDK patterns
   and syntax.

2. Discover nodes: Call search_nodes with queries for services you need
   (e.g., ["gmail", "slack", "schedule trigger"]) and utility nodes
   (e.g., ["set", "if", "merge", "code"]). Note the discriminators
   (resource/operation/mode) in the results.

3. (Optional) Get suggestions: Call get_suggested_nodes with workflow
   technique categories for curated recommendations.

4. Get type definitions: Call get_node_types with ALL node IDs you plan
   to use, including discriminators from search results. This returns
   the exact TypeScript parameter definitions. DO NOT skip this —
   guessing parameter names creates invalid workflows.

5. Write the workflow code using the SDK patterns from the reference and
   the exact parameter names from the type definitions. Follow the
   coding guidelines and design guidance sections of the SDK reference
   (retrieve them with get_sdk_reference using sections "guidelines"
   and "design").

6. Validate: Call validate_workflow with your full code. Fix any errors
   and re-validate until valid.

7. Create: Call create_workflow_from_code with the validated code to
   save the workflow to n8n. Include a short `description` (1-2 sentences)
   summarizing what the workflow does — this helps users find and
   understand their workflows.

8. Update: Call update_workflow with the workflow ID and validated code.
   Follow steps 2-6 to prepare the new code, then call update instead
   of create.

9. Archive: Call archive_workflow with the workflow ID.
```

**Implication for the plugin:** Tool names in the text above are
interpolated from constants; renames in the n8n codebase flow through
automatically. The plugin's `/n8n:build-workflow` skill should detect
missing builder tools on first use (via the MCP tool list) and fall
back to clear guidance directing the user to enable the flag rather
than failing mid-orchestration.

---

## 8. Skills

### 8.1 `/n8n:build-workflow`

**Purpose:** Guide Claude through the full workflow creation flow.

```markdown
---
description: >
  Build an n8n workflow automation from a natural language description.
  Use when the user wants to create a new workflow, automate a process,
  or connect services together.
---

# Build Workflow

Build an n8n workflow based on the user's description: "$ARGUMENTS"

Follow these steps in order:

1. **Understand the requirement** — Clarify what the user wants to automate,
   what services are involved, and what triggers the workflow.

2. **Read the SDK reference** — Call `get_sdk_reference` to learn the SDK
   patterns and syntax.

3. **Discover nodes** — Call `search_nodes` with queries for each service
   the user mentioned (e.g., ["gmail", "slack", "schedule trigger"]) and
   utility nodes (e.g., ["set", "if", "merge", "code"]). Note the
   discriminators (resource/operation/mode) in the results.

4. **Get type definitions** — Call `get_node_types` with ALL node IDs
   you plan to use, including discriminators from search results. This
   returns the exact TypeScript parameter definitions. Do NOT guess
   parameter names.

5. **Write the workflow code** using the SDK patterns from the reference
   and the exact parameter names from the type definitions.

6. **Validate** — Call `validate_workflow` with your code. Fix any errors
   and re-validate until valid.

7. **Create** — Call `create_workflow_from_code` with the validated code.
   Include a short description (1-2 sentences) summarizing what the
   workflow does.

8. **Report** — Share the workflow URL and summarize what was created,
   including trigger type and key nodes. Ask the user if they want to
   test or publish it.
```

### 8.2 `/n8n:run-workflow`

**Purpose:** Live-execute a workflow against its active version.

**⚠ Not for safe/sandboxed testing.** `execute_workflow` is
`openWorldHint: true` — it hits real external systems. For dry runs
with pin data, use `/n8n:test-workflow` (§8.8).

**⚠ Multi-trigger limitation.** `execute_workflow` has no trigger
selector; `findMcpSupportedTrigger()` always picks the first supported
trigger. Skills should detect multi-trigger workflows and refuse rather
than silently firing the first one.

```markdown
---
description: >
  Live-run an n8n workflow and show the results. Use when the user
  wants to execute, trigger, or kick off a workflow for real. For
  safer dry runs with pinned data, use /n8n:test-workflow.
argument-hint: [workflow name or id]
---

# Run Workflow

Run an n8n workflow: "$ARGUMENTS"

Steps:

1. **Resolve the workflow.** If `$ARGUMENTS` looks like an ID (no
   whitespace, matches n8n's ID shape), skip straight to
   `get_workflow_details`. Otherwise call `search_workflows` (which
   searches by name/description only) and pick the unambiguous match.
   Filter to `availableInMCP: true`; if the best match is `false`,
   surface the remediation in §14.4.

2. **Get details** — Call `get_workflow_details`. `nodes` is the
   draft; `activeVersion.nodes` is what production runs. If they
   differ, warn before executing in production mode. Note that
   `triggerInfo` is computed from draft nodes only — for production
   runs, inspect `activeVersion.nodes` separately.

3. **Choose execution mode FIRST — this is a VERSION choice, not a
   trigger choice.** From `execute-workflow.tool.ts:224`
   `getVersionDataForExecution`:
   - `executionMode: 'manual'` → runs the current DRAFT (all trigger
     types supported, including unpublished workflows)
   - `executionMode: 'production'` → runs `activeVersion` (manual
     triggers excluded; requires the workflow to be published)

   Choose `manual` when:
   - The user says "test the current version" / "run the draft"
   - The workflow is unpublished
   - The workflow has a Manual Trigger

   Choose `production` when:
   - The user says "run it live" / "for real"
   - The workflow is published and the user wants the active version

   Ask if it's ambiguous.

4. **Refuse multi-trigger workflows — on the correct node set.**
   Count supported triggers on the node set that matches the chosen
   mode: **draft nodes** if `manual`, **`activeVersion.nodes`** if
   `production`. If more than one supported trigger is present on
   the relevant set, explain the server picks the first one
   automatically with no override, and ask the user to disable the
   others in the n8n UI (or publish a single-trigger version). Do
   NOT proceed. A workflow that is multi-trigger in draft but
   single-trigger in `activeVersion` is fine to run in `production`.

5. **Execute** — Call `execute_workflow` with inputs matching the
   chosen trigger:
   - **Manual / Schedule** → no inputs
   - **Webhook** → `webhookData`
   - **Chat** → `chatInput`
   - **Form** → `formData`

6. **Register for monitor (Claude Code only)** — If the monitor is
   enabled, append `{executionId, workflowId, workflowName, ...}` to
   `~/.claude/plugins/n8n/watchlist.json` so Claude is notified when
   it finishes.

7. **Poll briefly** — Call `get_execution` a couple of times for
   short-running workflows. For longer ones, hand off to the monitor.

8. **Report** — Use the `execution-result` output style. On failure,
   suggest `/n8n:debug-execution {workflowId} {executionId}` —
   include BOTH IDs, since `get_execution` needs both.
```

### 8.3 `/n8n:debug-execution`

**Purpose:** Investigate a failed workflow execution.

**⚠ Contract constraint:** `get_execution` requires **both**
`workflowId` and `executionId`. `search_workflows` searches by
name/description only (`workflow.repository.ts:applyNameFilter()`) —
it cannot recover the owning workflow from an execution ID. This
skill therefore requires both IDs as explicit inputs. Every handoff
path (run-workflow failure, monitor notification) must supply both.

```markdown
---
description: >
  Debug a failed n8n workflow execution. Use when the user pastes
  both a workflow ID and an execution ID, or responds to a monitor
  notification about a failure.
argument-hint: [workflowId] [executionId]
---

# Debug Execution

Debug an n8n workflow execution: "$ARGUMENTS"

Steps:

1. **Require both IDs.** If either `workflowId` or `executionId` is
   missing, stop and ask for them. Point the user to the execution
   page in their n8n UI where both IDs appear in the URL. Do NOT
   attempt to look up the workflow from the execution ID alone — the
   MCP surface doesn't support it today.

2. **Fetch execution data** — Call `get_execution` with
   `includeData: true`. Use `nodeNames` and `truncateData` to keep the
   response focused for big workflows.

3. **Analyze the failure**:
   - Which node failed and its error message
   - The input data that reached the failing node
   - Whether upstream nodes produced expected outputs
   - Whether it's a configuration issue, a data issue, or an external
     service error

4. **Diagnose** — Explain what went wrong, which node is root cause,
   and whether it's workflow logic or an external dependency.

5. **Suggest fixes** — If the fix requires editing the workflow and
   the builder tools are available, hand off to `/n8n:update-workflow`
   with a concrete change proposal. Otherwise point the user at the
   n8n UI.
```

### 8.4 `/n8n:list-workflows`

**Purpose:** Quick overview of the user's workflows.

```markdown
---
description: >
  List and search n8n workflows. Use when the user asks what workflows
  they have, wants to find a specific workflow, or needs an overview of
  their automations.
---

# List Workflows

Search for workflows: "$ARGUMENTS"

1. Call `search_workflows` with the user's query. If the user named a
   project, first attempt `search_projects` to resolve the `projectId`.
   If `search_projects` isn't available (builder disabled), ask the
   user to paste the project ID, or fall back to a global search.

2. Present the results as a clear list showing:
   - Workflow name
   - Active/inactive status
   - MCP availability (`availableInMCP` — call out any that are `false`
     because action skills will reject them)
   - Last updated date

3. **Trigger type is not returned by `search_workflows`.** If the user
   asks for it, offer to fan out `get_workflow_details` for a small
   subset — never for the full list by default.

4. If the user wants details on a specific workflow, call
   `get_workflow_details` and summarize the nodes and connections.
```

### 8.5 `/n8n:manage-data-table`

**Purpose:** Create and populate data tables.

**⚠ Builder-flag dependency:** `create_data_table` requires a
`projectId`. Project discovery via `search_projects` is a builder
tool, so on a builder-disabled instance the skill must fall back to
asking the user for a project ID manually.

```markdown
---
description: >
  Create or manage n8n data tables. Use when the user wants to create a
  table, add data, or manage structured data in n8n.
---

# Manage Data Table

Manage n8n data tables: "$ARGUMENTS"

Steps:

1. **Understand the request** — Create / add rows / modify structure /
   search.

2. **Resolve the project** (for create) — Call `search_projects` if
   available. If not available (builder disabled), ask the user for a
   project ID. Do not invent one.

3. **Execute** — Use the appropriate tools:
   - `search_data_tables` to find existing tables
   - `create_data_table` with `projectId`, name, and column definitions
   - `add_data_table_rows` to insert data (max 1000 rows per call)
   - Column management tools for schema changes

4. **Report** — Confirm what was done and show the table structure.
```

### 8.6 `/n8n:publish-workflow`

**Purpose:** Activate a workflow for production.

```markdown
---
description: >
  Publish (activate) an n8n workflow for production execution. Use when
  the user wants to go live with a workflow, enable it, or move it from
  draft to active.
argument-hint: [workflow name or id]
---

# Publish Workflow

Publish an n8n workflow: "$ARGUMENTS"

1. **Resolve the workflow.** If `$ARGUMENTS` looks like an ID, go
   straight to `get_workflow_details` — `search_workflows` cannot
   resolve raw IDs (it searches name/description only via
   `applyNameFilter()`). Otherwise call `search_workflows` and pick
   the unambiguous match. Reject workflows with `availableInMCP: false`
   and surface remediation.

2. **Confirm intent — current draft only for v1.** Call
   `get_workflow_details` first. `triggerInfo` comes from the draft
   nodes, so the summary only reflects the current draft accurately.
   If the user asks to publish a historical `versionId`, refuse and
   ask them to do it from the n8n UI — the MCP surface has no
   version-aware details path today, and summarizing the wrong
   trigger shape is a foot-gun. Revisit when n8n adds
   `get_workflow_version_details` or similar.

3. **Publish the current draft.** Call `publish_workflow` with the
   workflow ID and no `versionId`.

4. **Fetch webhook URL if applicable** — `publish_workflow` does NOT
   return webhook URLs. If the workflow uses a Webhook trigger, make
   a follow-up `get_workflow_details` call and surface the webhook
   endpoint so the user can wire it up.

5. **Report** — Confirm the active version and any webhook URLs.
```

### 8.7 `/n8n:update-workflow`

**Purpose:** Modify an existing workflow's nodes/connections.

**⚠ Scope caveat.** `update_workflow` takes **full SDK code** and
replaces the workflow entirely. There is no MCP tool to convert an
existing UI-authored workflow JSON back into SDK code. For
UI-authored workflows, Claude must reconstruct the entire workflow
from the draft JSON returned by `get_workflow_details` — fragile for
large or expression-heavy workflows. Additional sharp edges in
`update-workflow.tool.ts` and `credentials-auto-assign.ts`:

- Credential preservation is best-effort; matches on `nodeName` +
  `nodeType`. Renaming a node can drop its credential.
- HTTP Request nodes are explicitly skipped by credential auto-assign.

**Until a JSON-to-SDK conversion path exists, this skill is reliable
for AI-generated workflows that follow the SDK flow. For UI-authored
workflows, prefer the n8n UI and warn the user before attempting.**

```markdown
---
description: >
  Update an existing n8n workflow with new or modified logic. Use when
  the user wants to change, edit, or modify a workflow that already
  exists (e.g., "change the Slack channel" or "add an error handler").
  Reliable for AI-generated workflows; for UI-authored workflows,
  warn and offer to hand off to the n8n UI.
argument-hint: [workflow name or id] — [what to change]
---

# Update Workflow

Update an n8n workflow: "$ARGUMENTS"

1. **Resolve the workflow.** If `$ARGUMENTS` carries an ID, skip
   straight to `get_workflow_details` (same reason as §8.2 / §8.6 —
   `search_workflows` searches by name/description, not ID).
   Otherwise call `search_workflows` first. Reject workflows with
   `availableInMCP: false`.

2. **Classify origin (heuristic)** — Check `workflow.meta.aiBuilderAssisted`
   (set by `create-workflow-from-code.tool.ts` and
   `update-workflow.tool.ts`). Treat missing/`false` as "likely
   UI-authored" and surface: "This workflow was likely authored in the
   n8n UI. Updating via SDK regenerates the entire definition, which
   can break expressions, disabled branches, and manually curated
   layout. Proceed, or hand off to the n8n UI?"
   The flag is a best-effort signal, not proof of SDK round-trip
   safety.

3. **Plan the change** — Describe exactly what will be modified.
   Warn about active executions if the change is structural.

4. **Prepare code** — Follow steps 2-6 of the build flow:
   `search_nodes` → `get_node_types` → write code → `validate_workflow`.
   Preserve credential attachments by keeping node names and types
   stable wherever possible; call this out if a rename is unavoidable.

5. **Apply** — Call `update_workflow` with the workflow ID and
   validated code. This replaces the workflow definition entirely.

6. **Report** — Summarize what changed, flag any dropped credentials,
   and offer to test with `/n8n:test-workflow` before publishing.
```

### 8.8 `/n8n:test-workflow`

**Purpose:** Dry-run a workflow with pinned data, bypassing external
services where possible.

**⚠ Not fully side-effect-free.** Credential-free I/O nodes (Execute
Command, file-write, Code) execute for real even with pin data
(noted in `test-workflow.tool.ts`). This is closer to a sandbox than
a pure simulation — surface the caveat before the first run.

```markdown
---
description: >
  Test an n8n workflow with pinned data — pins trigger, credential,
  and HTTP nodes so external calls are bypassed. Use when the user
  wants to dry-run, verify, preview, or sandbox a workflow without
  live side effects. For live runs, use /n8n:run-workflow.
argument-hint: [workflow name or id]
---

# Test Workflow

Test an n8n workflow: "$ARGUMENTS"

Steps:

1. **Resolve the workflow.** ID-shaped → `get_workflow_details`
   direct; otherwise `search_workflows`. Filter to
   `availableInMCP: true`.

2. **Prepare pin data** — Call `prepare_test_pin_data` to get the
   schema. For each node the user wants to pin beyond the defaults,
   construct items matching the schema. If the user hasn't specified
   data, walk through the required pins with them.

3. **Surface the side-effect caveat** — name the specific nodes that
   will still run for real (Execute Command, file-write, Code). Ask
   for confirmation if any are present.

4. **Execute** — Call `test_workflow` with `workflowId`, `pinData`,
   and optionally `triggerNodeName` when the workflow has multiple
   triggers.

5. **Register for monitor (Claude Code only)** — Same as run-workflow.

6. **Report** — `execution-result` output style. On failure, hand off
   to `/n8n:debug-execution {workflowId} {executionId}`.
```

---

## 9. Agents

### 9.1 Workflow Builder Agent

**`agents/workflow-builder.md`**

```markdown
---
name: workflow-builder
description: >
  Specialized agent for building n8n workflows from natural language
  descriptions. Handles node discovery, type definitions, code generation,
  validation, and creation. Use when the user wants to build a complex
  workflow that may require iteration.
model: sonnet
maxTurns: 30
tools:
  - mcp__n8n__search_projects
  - mcp__n8n__search_folders
  - mcp__n8n__get_sdk_reference
  - mcp__n8n__search_nodes
  - mcp__n8n__get_node_types
  - mcp__n8n__get_suggested_nodes
  - mcp__n8n__validate_workflow
  - mcp__n8n__create_workflow_from_code
---

You are an expert n8n workflow builder. Your job is to create production-ready
n8n workflows from natural language descriptions.

## Tool surface

Your tool set is intentionally narrow: discovery, type lookup, validation,
creation. You do **not** own execution, testing, publishing, or updates —
those live in other skills/agents to keep your context focused on
getting the code correct.

- If the user wants to test → hand back and suggest `/n8n:run-workflow`
  or `/n8n:debug-execution` (which uses `test_workflow` with the
  destructive-in-practice warning applied).
- If the user wants to publish → hand back and suggest
  `/n8n:publish-workflow`.
- If the user wants to modify an existing workflow → hand back and
  suggest the `workflow-updater` subagent or `/n8n:update-workflow`.

## Workflow

1. Read the SDK reference first (`get_sdk_reference`)
2. Search for the nodes needed (`search_nodes`)
3. Get their type definitions (`get_node_types`) — NEVER guess parameter names
4. Write the workflow code following SDK patterns exactly
5. Validate (`validate_workflow`) — fix errors until valid
6. Create (`create_workflow_from_code`) with a clear `description`

## Guidelines

- Always get type definitions before writing code
- Use exact parameter names from type definitions
- Include error-handling nodes where appropriate
- Give nodes clear, purpose-describing names
- For complex workflows, consider sub-workflows
- After creation, report the workflow URL and suggest the next skill
  (test, publish) rather than invoking it yourself

## Safety

- Never mutate an existing workflow (that's the updater's job)
- Flag workflows that will interact with external services
- Flag destructive operations (deleting data, sending emails) in the
  post-create summary so the user sees them before publishing
```

> **Plugin constraint:** plugin-shipped agents cannot declare `hooks`,
> `mcpServers`, or `permissionMode` fields (Claude plugin security
> restriction). All fields shown above are allowed.

### 9.2 Workflow Debugger Agent

**`agents/workflow-debugger.md`**

```markdown
---
name: workflow-debugger
description: >
  Specialized agent for debugging failed n8n workflow executions.
  Analyzes execution data, identifies root causes, and suggests or
  applies fixes. Use when the user has a failing workflow.
model: sonnet
maxTurns: 20
tools:
  - mcp__n8n__search_workflows
  - mcp__n8n__get_workflow_details
  - mcp__n8n__get_execution
  - mcp__n8n__execute_workflow
  - mcp__n8n__test_workflow
  - mcp__n8n__prepare_test_pin_data
  - mcp__n8n__update_workflow
  - mcp__n8n__validate_workflow
  - mcp__n8n__get_sdk_reference
  - mcp__n8n__search_nodes
  - mcp__n8n__get_node_types
---

You are an expert n8n workflow debugger. Your job is to analyze failed
executions, identify root causes, and fix workflows.

## Debugging Process

1. Get the full execution data with `includeData: true`
2. Identify which node failed and examine its error
3. Trace the data flow from trigger to failing node
4. Determine if the issue is:
   - Configuration error (wrong parameters, missing credentials)
   - Data error (unexpected input format, missing fields)
   - Logic error (wrong conditions, incorrect connections)
   - External service error (API down, rate limited, auth expired)
5. Suggest or apply the fix

## Reporting

- Be specific about which node failed and why
- Show the data that caused the failure when relevant
- Provide actionable fixes, not just descriptions
- If updating the workflow, explain what changed and why
```

---

## 9a. Monitors

Plugins can ship background monitors (`monitors/monitors.json`) that poll
external systems and inject messages into Claude when state changes.
The n8n plugin ships one by default.

### Execution Status Monitor

**`monitors/monitors.json`**

```json
{
  "monitors": [
    {
      "name": "execution-status",
      "description": "Watches long-running n8n executions and notifies when they change state",
      "trigger": {
        "type": "command",
        "command": "node ${CLAUDE_PLUGIN_ROOT}/bin/poll-execution.js",
        "intervalSeconds": 20
      }
    }
  ]
}
```

**What it does.** `/n8n:run-workflow` and `/n8n:debug-execution`
register the execution in a local watchlist. The monitor polls each
entry on a 20-second cadence and notifies Claude when the status
transitions to a terminal state. Raw MCP can't do this — it's
request/response only.

**Claude Code only.** Monitors run in the local Claude Code process.
claude.ai users get the full plugin minus this feature; the skills
that register executions no-op the write gracefully when there's no
writable state dir.

### 9a.1 Monitor Design

Three decisions, with defaults chosen for a clean first cut:

**Watchlist.** Per-user JSON at `~/.claude/plugins/n8n/watchlist.json`,
locked for concurrent writes. Not `${CLAUDE_PLUGIN_ROOT}` — that's
read-only and shared across users.

```jsonc
{
  "version": 1,
  "entries": [
    {
      "executionId": "42",
      "workflowId": "abc123",
      "workflowName": "Daily Report",
      "instanceUrl": "https://acme.n8n.cloud",
      "startedAt": "2026-04-17T10:30:00Z"
    }
  ]
}
```

**Auth.** The monitor uses the **n8n Public API**, not the MCP API.
These are different token audiences:

- MCP API keys (`mcp-api-key.service.ts`) → audience `mcp-server-api`,
  used for MCP endpoint auth. Not accepted by the public API.
- Public API keys (`packages/cli/src/services/public-api-key.service.ts`)
  → used by `/<publicApiPath>/v1/...` handlers, support scopes like
  `execution:read`.

The plugin therefore adds an optional `userConfig` field
`n8n_public_api_key` (`sensitive: true`). If set, the monitor calls
`GET {instanceUrl}/{publicApiPath}/v1/executions/{id}` with
`X-N8N-API-KEY` header. If unset, the monitor self-disables and
`/n8n:run-workflow` and `/n8n:test-workflow` surface a one-line
upgrade hint (they own the watchlist registration, not the build
skill). MCP OAuth tokens are not reused — they live in Claude Code's
credential store with no stable plugin-process access.

**Public API path is configurable.** The default is `/api`, but
self-hosted instances can override via `N8N_PUBLIC_API_ENDPOINT`
(`packages/@n8n/config/src/configs/public-api.config.ts`). Path probing
must be scope-safe: the collection route (`GET /executions`) requires
`execution:list` (`executions.handler.ts:140`), while the per-ID route
(`GET /executions/{id}`) requires `execution:read`
(`executions.handler.ts:83`). Since we only demand `execution:read`,
the probe uses the per-ID route with a sentinel ID (e.g. literal
`__n8n_claude_plugin_probe__`).

**Status code alone is not enough.** The public API can be disabled
(routes not registered, `public-api/index.ts:232-233`), and
`server.ts:405-435` rewrites unknown `GET`s to `index.html` based on
`Accept`. A naive `404`-means-success probe treats the UI HTML
fallback as a hit. The probe must therefore combine status code +
response signal:

- Set `Accept: application/json` on every probe request to push
  Express past the HTML catch-all when possible.
- On `404`, only accept the candidate when `Content-Type` starts
  with `application/json` AND the body parses to an n8n-shaped error
  (e.g. has a `message` or `code` field). HTML responses are rejected.
- `401` with a JSON body → path is live, but the public API key is
  missing, malformed, unknown, expired, or the user is disabled
  (`ApiKeyAuthStrategy.authenticate()` rejects before any scope check).
  Fail with the "check or refresh your `n8n_public_api_key`" copy.
- `403` with a JSON body → key is valid but lacks `execution:read`
  (`publicApiScope()` rejects only after auth succeeds). Fail with
  the scope-missing error copy.
- `200` with a matching JSON body would mean the sentinel matched a
  real execution (astronomically unlikely but possible). Treat as
  success and move on.
- Any other outcome → try the next candidate.

**Public API disabled.** If every candidate fails the combined probe
(no JSON-shaped response at all), the monitor logs one notice and
stops. Re-probes on next Claude Code start.

**Escape hatch.** The third `userConfig` field `n8n_public_api_path`
bypasses probing entirely — set it when auto-detection is unreliable
(reverse proxies, custom error middleware, WAF that rewrites error
bodies).

**Required scope.** `execution:read` is sufficient — the monitor
only polls per-ID. It never calls the list route.

**Policy.**

| Setting | Default | Reason |
|---|---|---|
| Base interval | 20s | Responsive for multi-minute workflows without hammering the instance |
| Max concurrent watches | 20 | Comfortable ceiling for a single user; guards against runaway registration |
| Per-entry TTL | 1 hour | Plugin-side ceiling to bound memory and notification noise. Not derived from n8n's runtime defaults — `ExecutionsConfig.timeout` defaults to `-1` (unlimited) in `executions.config.ts`; `3600` is the default `maxTimeout` cap, not the default runtime. Users with genuinely long-running workflows can raise the ceiling in a future `userConfig` field. |
| Transient-error backoff | `delay × min(2ⁿ, 8)` | Skips 1, 2, 4, 8, 8… ticks on network errors |
| Auth-error handling | Disable after 3 consecutive `401/403` | Emit one message; re-enable on next Claude Code start |
| Notification trigger | Terminal status only | `success`, `error`, `crashed`, `canceled` — never mid-run |
| Dedup | Skip existing `executionId` | Idempotent re-registration |
| Queue-mode cancellation | Never attempted | `execution-utils.ts` notes `ScalingService.stopJob()` needs a Bull job reference that's unavailable at the MCP layer. Monitor observes only; cancel must happen via n8n UI. |

> Keep monitor output terse — each line is injected into the session.
> Format: `[n8n] "Daily Report" finished: success (3 nodes, 12 items)`.

---

## 9b. Output Styles

Execution output from n8n is nested JSON (runs → nodes → items), which
Claude will happily dump as a wall of text. Ship a dedicated output
style so execution results render compactly.

**`output-styles/execution-result.md`**

```markdown
---
description: Renders n8n execution output as a per-node summary table
---

When summarizing an n8n execution result, render it as:

| Node | Status | Items out | Key fields |
|------|--------|-----------|------------|

- Use node name from the execution data.
- Status: ✅ success, ❌ error (include error message), ⏭ skipped.
- Items out: count of output items (`data.main[0].length`).
- Key fields: first 2-3 top-level keys from the first output item, or
  "(empty)" if the node produced no items.

After the table, show the full JSON only if the user asks.
```

---

## 10. Distribution Strategy

### 10.1 Official Anthropic Marketplace (Primary)

Submit the plugin to the official Anthropic marketplace via:
- **claude.ai:** `claude.ai/settings/plugins/submit`
- **Console:** `platform.claude.com/plugins/submit`

This makes the plugin discoverable by all Claude users. Anthropic reviews for
quality and safety. Aim for the **"Anthropic Verified"** badge.

### 10.2 n8n GitHub Repository (Secondary)

Host the plugin source in a dedicated repo (e.g., `n8n-io/n8n-claude-plugin`)
or as a subdirectory in the n8n monorepo. Ship a marketplace manifest at
**`.claude-plugin/marketplace.json`** (at the repo root — not a
top-level `marketplace.json`) so teams can add the marketplace and
install directly:

```json
{
  "name": "n8n-tools",
  "owner": {
    "name": "n8n GmbH",
    "email": "support@n8n.io"
  },
  "plugins": [
    {
      "name": "n8n",
      "source": "./",
      "description": "Build, run, and manage n8n workflow automations from Claude",
      "version": "1.0.0"
    }
  ]
}
```

Users install with:
```bash
/plugin marketplace add n8n-io/n8n-claude-plugin
/plugin install n8n@n8n-tools
```

### 10.3 npm Package (Optional)

Publish as `@n8n/claude-plugin` on npm for alternative distribution:

```json
{
  "source": {
    "source": "npm",
    "package": "@n8n/claude-plugin"
  }
}
```

---

## 11. Implementation Phases

### Phase 0: Feasibility Spikes

**Scope:** Validate plugin runtime behavior against real Claude
surfaces *before* committing to the skill/agent/monitor specs. The
repo already ships a developer-facing Claude plugin at
`.claude/plugins/n8n/`, but it has no `.mcp.json`, `monitors/`, or
`output-styles/` — none of the plugin-schema paths this plan relies on
are exercised yet.

- [ ] **Remote MCP via plugin `.mcp.json`** — stand up a throwaway
      plugin with only `type: "http"` + a real `${user_config.*}` URL.
      Confirm OAuth round-trips and tools list.
- [ ] **Monitor spike** — a minimal `monitors/monitors.json` + Node
      script that writes one line per tick. Confirm lines surface in
      the Claude session and behave under `/reload-plugins`.
- [ ] **Output style spike** — verify a custom style actually changes
      rendering on tool results.
- [ ] **Plugin settings.json spike** — confirm which fields are
      actually honored (the plan relies on them being narrow; verify).

Do not start Phase 1 until each spike produces a visible end-to-end
signal.

### Phase 1: Core Plugin (MVP)

**Scope:** MCP connection + basic skills

- [ ] Create plugin directory structure
- [ ] Write `plugin.json` manifest with `userConfig` for instance URL
- [ ] Write `.mcp.json` remote server configuration (with `type: "http"`)
- [ ] Implement `/n8n:build-workflow` skill
- [ ] Implement `/n8n:run-workflow` skill
- [ ] Implement `/n8n:list-workflows` skill
- [ ] Run `claude plugin validate .` — passes with zero warnings
- [ ] Test locally with `claude --plugin-dir ./n8n-plugin`
- [ ] **OAuth E2E on n8n Cloud:** enable the plugin pointing at a real
      n8n Cloud instance, complete the consent screen, invoke
      `search_workflows`, then wait for the access token to expire and
      confirm refresh works without re-consent
- [ ] **OAuth E2E on self-hosted:** repeat against a self-hosted
      instance (captures HTTPS/TLS + arbitrary domain edge cases)
- [ ] **Claude Code vs claude.ai parity:** same tool call from both
      surfaces, same result
- [ ] Write README with setup instructions (include reachability matrix)

**Validates:** Remote MCP connection works, OAuth flow + refresh
completes on both n8n Cloud and self-hosted, basic tool orchestration
is functional, and the plugin works from both Claude Code and claude.ai.

### Phase 2: Advanced Skills + Agents

**Scope:** Debugging, lifecycle, data tables, specialized agents

- [ ] Implement `/n8n:publish-workflow` skill
- [ ] Implement `/n8n:update-workflow` skill
- [ ] Implement `/n8n:debug-execution` skill
- [ ] Implement `/n8n:manage-data-table` skill
- [ ] Create `workflow-builder` agent (narrow tool surface per §9.1)
- [ ] Create `workflow-debugger` agent
- [ ] Test agent tool restrictions work correctly
- [ ] Test multi-step flows (build → test → publish, update → test)

### Phase 2.5: Monitor

**Scope:** The execution-status monitor — the only component with real
runtime code. Treat as its own phase so the watchlist/auth contract is
ratified before the binary is written.

- [ ] Add `n8n_public_api_key` + `n8n_public_api_path` to `userConfig`
- [ ] Write watchlist reader/writer with file-lock (schema in §9a.1)
- [ ] Implement public-API path auto-detection with candidate probing
      and cached resolution
- [ ] Add watchlist registration to `/n8n:run-workflow` and
      `/n8n:debug-execution` skills
- [ ] Implement `bin/poll-execution.js`: keychain-backed public API
      key lookup, REST poll with `X-N8N-API-KEY`, backoff, TTL pruning,
      dedup, terminal-state notifications
- [ ] `monitors/monitors.json` with 20s interval
- [ ] Add output-style `output-styles/execution-result.md`
- [ ] Test with 3 concurrent watched executions across `success`,
      `error`, `crashed` transitions
- [ ] Test public API path override via `n8n_public_api_path`
- [ ] Document Claude-Code-only limitation and public-API-vs-MCP-key
      distinction in README

### Phase 3: Polish + Submit

**Scope:** Quality, docs, marketplace submission

- [ ] Write comprehensive README
- [ ] Write CHANGELOG
- [ ] Add LICENSE
- [ ] Test on n8n Cloud instances
- [ ] Test on self-hosted n8n instances
- [ ] Validate plugin structure: `claude plugin validate .`
- [ ] Submit to official Anthropic marketplace
- [ ] Set up GitHub repo with marketplace.json

### Phase 4: Iteration

**Scope:** Post-launch improvements based on feedback

- [ ] Add more skills based on user requests (e.g., credential management,
      workflow templates, execution history)
- [ ] Add hooks (e.g., auto-format workflow code on creation)
- [ ] Consider adding an n8n-specific LSP for workflow SDK code
- [ ] Explore n8n Cloud-specific features (direct URL resolution,
      managed auth)

---

## 12. Open Questions & Decisions

### 12.1 Plugin Repository Location

**Decision (v0.1):** Monorepo subdirectory at
`packages/@n8n/claude-plugin/`. Picked for easier iteration while the
plugin contract is still moving — any MCP tool change in
`packages/cli/src/modules/mcp/` can update plugin skill copy in the
same PR. The package has a minimal `package.json`
(`private: true`, no scripts, `files: […]` for future publish) so
Turbo and pnpm workspace tooling accept it without running lint /
typecheck / test against the markdown and JSON assets.

**Not chosen:** separate repo (`n8n-io/n8n-claude-plugin`). Cleaner
release cycle and independent versioning, but adds cross-repo PRs
for every MCP surface change. Revisit at v1.0 when the plugin
contract is stable and marketplace submission requires a public
repo as the source of truth.

The plugin still references the MCP server over HTTP, not via
imports — monorepo placement is an iteration-speed choice, not a
code-coupling one.

### 12.2 n8n Cloud vs Self-Hosted

For **n8n Cloud** users, the instance URL follows a predictable pattern
(`https://<account>.n8n.cloud`). The plugin could offer a streamlined
setup path for Cloud users.

For **self-hosted** users, the instance URL is arbitrary. The `userConfig`
prompt handles this, but docs should include notes about:
- HTTPS requirement (MCP transport)
- Network accessibility (the instance must be reachable from Claude's
  servers for claude.ai, or from the user's machine for Claude Code)
- Firewall/proxy considerations

### 12.3 Builder Tools Availability

The workflow builder tools are gated by `N8N_MCP_BUILDER_ENABLED`.
**The default is `true`** (`@n8n/config/src/configs/endpoints.config.ts`),
so out-of-the-box n8n Cloud and most self-hosted installs have the full
25-tool surface. Operators can set it to `false` to expose only 15
tools.

**Correct split (verified in `mcp.service.ts`):**
- **15 non-builder** (always on): `search_workflows`,
  `get_workflow_details`, `execute_workflow`, `get_execution`,
  `test_workflow`, `prepare_test_pin_data`, `publish_workflow`,
  `unpublish_workflow`, plus 7 data-table tools
- **10 builder** (flag-gated): `search_nodes`, `get_node_types`,
  `get_suggested_nodes`, `validate_workflow`,
  `create_workflow_from_code`, `update_workflow`, `archive_workflow`,
  `get_sdk_reference`, **`search_projects`**, **`search_folders`**

**Implication:** `search_projects` and `search_folders` are NOT
always-on discovery tools. On a builder-disabled instance:

| Skill | Degradation on builder-disabled |
|---|---|
| `/n8n:build-workflow` | Dead — guide user to flip the flag |
| `/n8n:update-workflow` | Dead |
| `/n8n:debug-execution` | Works (doesn't need builder tools) |
| `/n8n:list-workflows` | Works; no project filter by name |
| `/n8n:run-workflow` | Works |
| `/n8n:publish-workflow` | Works |
| `/n8n:manage-data-table` | Partially — **create requires a projectId**; without `search_projects` the user must paste the ID |

When the flag is off, the server also returns only the one-line intro
in `InitializeResult.instructions` and reports version `1.0.0` instead
of `1.1.0`.

The plugin detects absent builder tools via the MCP tool list on first
use (not by probing the flag) and falls back with clear remediation
text in §14.4.

### 12.4 MCP Server Auth for Claude.ai vs Claude Code

**Server accepts both** OAuth access tokens and MCP API keys on the
same `Authorization: Bearer …` header —
`mcp-server-middleware.service.ts` decodes the JWT metadata and routes
to either `McpOAuthTokenService.verifyOAuthAccessToken` or
`McpServerApiKeyService.verifyApiKey`. There is no server-enforced
"OAuth-only for claude.ai" constraint.

The plugin nonetheless **prefers OAuth** as the default path for
product reasons:

| Context | Recommended plugin auth | Why |
|---|---|---|
| **Claude Code** (local) | OAuth (user-initiated) | Consent screen matches n8n UI, no long-lived shared secret |
| **claude.ai** (remote) | OAuth | Same reason; key rotation/revoke flows work without touching plugin config |

**MCP API-key auth is still supported** for users who prefer it, but
it's an advanced path: users paste the key into the `Authorization`
header via a custom `.mcp.json` override. n8n's own editor UI already
generates a ready-to-copy snippet in `MCPAccessTokenPopoverTab.vue`.
The plugin does not reimplement that flow.

**Scope reality check.** `SUPPORTED_SCOPES` in `mcp-oauth-service.ts`
is currently `['tool:listWorkflows', 'tool:getWorkflowDetails']`, and
`verifyAccessToken()` in `mcp-oauth-token.service.ts` returns
`scopes: []`. The scope story is not yet end-to-end enforced. Skill
error copy must not reference specific scope strings until the server
advertises a stable set.

### 12.5 Tool Permissions

Plugin-shipped `settings.json` only supports `agent` and
`subagentStatusLine` — it **cannot** declare default allow/deny lists
for tools (`permissions.allow` / `permissions.deny` are silently
ignored). Permission defaults are a user-settings concern, not a
plugin manifest concern.

Instead, the plugin relies on the tool annotations that n8n's MCP
server already emits. **Important reality check on what those
annotations say today** (grepped from each tool file):

| Tool | `destructiveHint` | `openWorldHint` | Claude prompt behavior |
|---|---|---|---|
| `search_*`, `get_*`, `validate_workflow`, `prepare_test_pin_data` | `false` | `false` | Auto-approved |
| `publish_workflow`, `unpublish_workflow` | **`false`** | `false` | Auto-approved by default — surprising given the real-world effect |
| `create_data_table`, `add_data_table_rows`, `add_data_table_column`, `rename_*` | **`false`** | `false` | Auto-approved by default |
| `delete_data_table_column` | `true` | `false` | Per-invocation approval |
| `create_workflow_from_code` | **`false`** | `false` | Auto-approved by default |
| `update_workflow`, `archive_workflow` | `true` | `false` | Per-invocation approval |
| `execute_workflow` | `true` | `true` | Per-invocation approval (high friction) |
| `test_workflow` | `true` | `false` | Per-invocation approval |

**The gap:** `publish_workflow`, `unpublish_workflow`,
`create_data_table`, and `create_workflow_from_code` all mutate
durable state but are flagged `destructiveHint: false`. If we want
Claude to prompt before those, the server must tighten its
annotations first — the plugin cannot override hints from the client
side.

**Pre-launch action item:** file a server PR to promote at minimum
`publish_workflow`, `unpublish_workflow`, and
`create_workflow_from_code` to `destructiveHint: true`, and decide
case-by-case on the data-table writes (the "not destructive unless
overwriting" framing is defensible for row inserts).

The README documents the recommended *user* settings for teams that
want to pre-approve read-only tools:

```jsonc
// In the user's ~/.claude/settings.json or project .claude/settings.local.json
{
  "permissions": {
    "allow": [
      "mcp__n8n__search_*",
      "mcp__n8n__get_*",
      "mcp__n8n__validate_workflow"
    ]
  }
}
```

Users never paste this into the plugin itself — the plugin just
provides the recipe.

---

## 13. Comparison with Existing Plugins

| Aspect | Figma Plugin | Linear Plugin | n8n Plugin (Planned) |
|---|---|---|---|
| **MCP Server** | Remote (Figma hosts) | Remote (Linear hosts) | Remote (user's n8n instance) |
| **Auth** | OAuth | OAuth | OAuth (n8n's built-in) + API key |
| **Skills** | Design-to-code, screenshot | Issue management | Build, run, publish, update, debug workflows, manage data tables |
| **Agents** | None visible | None visible | Workflow builder (narrow), workflow debugger |
| **Monitors** | None | None | Execution status poller |
| **Output Styles** | None | None | Per-node execution result table |
| **User Config** | None (URL-based) | None (SaaS) | Instance URL required |
| **Key Differentiator** | Bidirectional design sync | Project management | Full automation platform with proactive execution status |

The n8n plugin is unique in that it connects Claude to a **user-hosted**
service rather than a centralized SaaS. This means the `userConfig` for
instance URL is essential and the auth flow must work with arbitrary
domains.

---

## 14. Content & Copy Deck

> Drafts for review. Engineering implements against these strings so
> downstream edits stay in one place. Ratify with n8n content/marketing
> before v1.0.

### 14.1 Marketplace Listing

| Field | Copy |
|---|---|
| Plugin name | `n8n` |
| Tagline | Build, run, and debug n8n workflows without leaving Claude |
| Short description (≤60 chars) | Build, run, and debug n8n workflows from Claude. |
| Medium description (≤160 chars) | Connect Claude to your n8n instance. Build workflows from plain English, run them, debug failures, and manage data tables — all from chat. |
| Categories | Automation, Developer Tools, Productivity |
| Icon | `assets/icon.svg` — solid n8n mark on rounded square, 256×256 |

**Long description** (marketplace listing body):

> n8n is an open-source workflow automation platform with 400+
> integrations — Slack, Gmail, Postgres, OpenAI, and the rest of the
> SaaS stack. This plugin gives Claude direct access to your n8n
> instance so you can describe an automation in plain English and have
> Claude build it, run it, and debug it for you.
>
> Everything runs against your own instance — cloud or self-hosted.
> Authentication uses n8n's built-in OAuth, so your credentials never
> leave your instance.

**Feature bullets:**

- Build production workflows from a natural-language brief (400+ integrations)
- Run, re-run, and test workflows with pin data
- Debug failed executions — Claude names the broken node and explains why
- Publish, update, and archive workflows with dedicated slash commands
- Create and populate data tables from a conversation
- Proactive execution-status notifications (Claude Code only)
- Works with n8n Cloud and self-hosted

### 14.2 Skill Descriptions

Populates the `description` field of each skill's frontmatter and
drives Claude's auto-invocation. Phrased as "Use when X" to broaden
the match surface.

| Skill | Description |
|---|---|
| `/n8n:build-workflow` | Build an n8n workflow automation from a natural-language brief. Use when the user wants to create a workflow, automate a process, connect services, or set up a scheduled job. |
| `/n8n:run-workflow` | Live-execute an n8n workflow and report the result. Use when the user wants to run, trigger, or kick off a workflow for real. For safer dry runs with pinned data, use `/n8n:test-workflow`. |
| `/n8n:test-workflow` | Dry-run an n8n workflow with pinned data so external services are bypassed. Use when the user wants to test, verify, sandbox, or preview a workflow without live side effects. |
| `/n8n:publish-workflow` | Activate an n8n workflow for production. Use when the user wants to publish, enable, activate, or go live with a workflow. |
| `/n8n:update-workflow` | Modify an existing n8n workflow. Use when the user wants to edit, tweak, or change a workflow — e.g. swap a Slack channel, add a step, fix a condition. |
| `/n8n:debug-execution` | Debug a failed n8n workflow execution. Use when the user mentions a failure, error, or wants to troubleshoot why a workflow didn't behave as expected. |
| `/n8n:list-workflows` | List and search n8n workflows. Use when the user asks what workflows exist, wants to find one by name, or needs an overview of their automations. |
| `/n8n:manage-data-table` | Create, inspect, and populate n8n data tables. Use when the user wants to create a table, add rows, rename columns, or manage structured data in n8n. |

### 14.3 Agent Descriptions

| Agent | Description |
|---|---|
| `workflow-builder` | Specialized agent for building n8n workflows end to end. Handles SDK lookup, node discovery, type resolution, validation, and creation. Use for non-trivial workflows that benefit from an isolated context. |
| `workflow-debugger` | Specialized agent for analyzing failed n8n executions, tracing data flow, and proposing or applying fixes. Use when a workflow consistently fails and the user wants root-cause analysis rather than a one-shot diagnosis. |

### 14.4 Error & Fallback Copy

Direct, no apologies, one sentence of cause + one sentence of next
step. Uses placeholders in `{braces}` for interpolation.

| Condition | Message |
|---|---|
| Builder tools disabled | Workflow building is disabled on this n8n instance. Ask your n8n operator to set `N8N_MCP_BUILDER_ENABLED=true`, or build in the n8n UI. |
| OAuth flow rejected | Consent was declined. Re-run the skill to try again, or check with your n8n admin that your user has MCP access enabled. |
| Workflow not available in MCP | "`{workflow_name}`" isn't exposed to MCP. Open n8n → Settings → MCP → Available Workflows, toggle it on, and retry. |
| Instance unreachable | Couldn't reach `{instance_url}`. Check the URL is correct and the instance is running — from claude.ai, the instance must be publicly reachable over HTTPS. |
| Localhost from claude.ai | `localhost` only works from Claude Code. Switch to Claude Code, or point the plugin at a publicly reachable instance. |
| Self-signed TLS cert | The instance's TLS certificate isn't trusted. Use a certificate from a public CA, or switch to n8n Cloud. |
| Invalid URL format | `{url}` doesn't look like a URL. Expected something like `https://acme.n8n.cloud` — no trailing slash. |
| Workflow not found | No workflow matches "`{query}`". Run `/n8n:list-workflows` to see what's available. |
| Workflow name ambiguous | Multiple workflows match "`{query}`": `{names}`. Pick one by name or ID. |
| Permission scope missing (public API) | Your `n8n_public_api_key` is missing the `execution:read` scope. Ask your admin to issue a key with that scope, or create a personal key under Settings → API. |
| Builder validation stuck | Validation still failing after three passes. Let's stop and review the errors together before retrying. |
| Monitor: API key missing | The execution-status monitor is off because `n8n_public_api_key` isn't set. Add one under Settings → API in n8n (needs the `execution:read` scope), then run `/plugin config n8n` to paste it. OAuth covers every other feature. |
| Monitor: key invalid (401) | Your `n8n_public_api_key` was rejected by n8n — it may be missing, malformed, expired, or from a disabled account. Refresh it under Settings → API, then update the plugin config. |
| Monitor: key missing scope (403) | Your `n8n_public_api_key` is valid but missing the `execution:read` scope. Reissue it with that scope, or ask your admin. |
| Monitor: repeated auth error | Monitor disabled after repeated auth failures. Refresh your `n8n_public_api_key`; the monitor re-enables on next Claude Code start. |
| Monitor: public API unreachable | Couldn't find the n8n Public API at `/api/v1/...` or common alternates. If your instance overrides `N8N_PUBLIC_API_ENDPOINT`, set `n8n_public_api_path` in plugin config. |
| Monitor: watch expired | Stopped watching "`{workflow_name}`" after 1 hour with no terminal state. Check the execution manually. |

### 14.5 Monitor Notification Templates

One line per event. The square-bracket prefix is the monitor's
signature — it helps the user spot proactive messages at a glance.

Notifications always include both `workflowId` and `executionId` so
the user (and Claude) can hand off directly to `/n8n:debug-execution`
without having to re-discover either ID — `get_execution` requires
both.

| Event | Template |
|---|---|
| Success | `[n8n] "{workflow_name}" ({workflowId}/{executionId}) succeeded in {duration} ({nodes} nodes, {items} items)` |
| Error | `[n8n] "{workflow_name}" ({workflowId}/{executionId}) failed at "{node_name}": {error_message} — debug with /n8n:debug-execution {workflowId} {executionId}` |
| Crashed | `[n8n] "{workflow_name}" ({workflowId}/{executionId}) crashed after {duration} — debug with /n8n:debug-execution {workflowId} {executionId}` |
| Canceled | `[n8n] "{workflow_name}" ({workflowId}/{executionId}) canceled after {duration}` |
| Watch expired | `[n8n] "{workflow_name}" ({workflowId}/{executionId}) still running after 1 hour — stopped watching` |

### 14.6 README Outline

```markdown
# n8n for Claude

> Build, run, and debug n8n workflows without leaving Claude.

## What this plugin does
- 1-paragraph pitch
- Screenshot or short clip of /n8n:build-workflow

## Install
- `/plugin install n8n`
- Enter your instance URL
- (Optional) Paste an API key for execution-status notifications

## Quick start
- Three worked examples: build, run, debug

## Reachability
- Claude Code ↔ self-hosted, localhost, cloud
- claude.ai ↔ public HTTPS only

## Slash commands
- Table linking to each skill

## Agents
- workflow-builder, workflow-debugger

## Troubleshooting
- Top five issues → §14.4 copy

## License
- MIT

## Contributing
- Link to plugin repo
```

### 14.7 CHANGELOG v1.0.0

```markdown
## 1.0.0 — Initial release

### Added
- Remote MCP connection to user's n8n instance (OAuth + API key)
- Seven skills: build, run, publish, update, debug, list, manage-data-table
- Two agents: workflow-builder, workflow-debugger
- Execution-status monitor (Claude Code) with configurable polling
- `execution-result` output style for compact per-node summaries
```

### 14.8 License Decision

**MIT.** The plugin is a thin client — configuration, markdown, and a
small Node polling script. It has no server code that competes with
n8n's commercial offering. MIT matches Claude-plugin ecosystem
expectations and avoids friction for downstream integrators.

Not recommended: n8n's own Sustainable Use License — it would surprise
users who expect plugins to be permissive, and the plugin's IP doesn't
warrant the protection.

### 14.9 Voice & Tone

- **Direct, technical, calm.** Match n8n's docs voice — not marketing
  hype, not corporate apology. Say what happened; say what to do next.
- **No emoji in notifications or error messages** — the square-bracket
  `[n8n]` prefix is the signature.
- **Workflow, not workflow automation.** Use "workflow" everywhere
  except the long marketplace description, where "workflow automation"
  helps SEO.
- **"Instance" not "server" or "backend."** Matches n8n docs.

---

## 15. Success Metrics

| Metric | Source | Status |
|---|---|---|
| **Installs** | Anthropic marketplace analytics | Available at launch |
| **MCP connections attributed to Claude** | `USER_CONNECTED_TO_MCP_EVENT` includes `client_name` / `client_version` from the MCP `initialize` handshake (`mcp.controller.ts`) | Available today |
| **Tool usage attributed to Claude** | `USER_CALLED_MCP_TOOL_EVENT` payload (`mcp.types.ts`) currently lacks `client_name` | **Instrumentation gap — plug-side source marker or server-side client propagation required before launch** |
| **Workflow creation rate via plugin** | `workflow-saved` with `aiBuilderAssisted` flag (`workflow.service.ts` → `telemetry.event-relay.ts` records `ai_builder_assisted`) is **not plugin-specific**. Any AI-assisted save path shares it. | Needs a dedicated plugin marker (e.g. pass a source tag through `create_workflow_from_code` inputs) |
| **User retention** | Plugin-enabled telemetry + repeat MCP connection events | Available once the source marker lands |

**Action before launch:** add a plugin-origin marker. Two options —
(a) include `client_name` in `USER_CALLED_MCP_TOOL_EVENT` payloads
at the middleware layer; (b) have the plugin pass a `source: "claude-plugin"`
hint through writable tool inputs. Option (a) is cleaner.

---

## 16. References

- [Claude Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugin Submission (claude.ai)](https://claude.ai/settings/plugins/submit)
- [Plugin Submission (Console)](https://platform.claude.com/plugins/submit)
- [n8n MCP Server](packages/cli/src/modules/mcp/)
- [n8n MCP Tool Constants](packages/@n8n/ai-workflow-builder.ee/src/code-builder/constants.ts)
- [n8n MCP Instructions](packages/cli/src/modules/mcp/tools/workflow-builder/mcp-instructions.ts)
- [MCP Protocol Spec](https://modelcontextprotocol.io)

---

## Revision history

### Round 1 — external critique (codex exec)

Applied the following changes after independent codebase audit:

1. **Auth framing (§3, §6, §12.4)** — corrected to reflect that both
   OAuth tokens and MCP API keys are accepted on the same endpoint
   (`mcp-server-middleware.service.ts`). Plugin's OAuth-first stance
   is a product choice, not a server constraint. Noted existing in-n8n
   MCP UI (`features/ai/mcpAccess/`) that the plugin builds on top of.
2. **Tool categorization (§7, §7.1, §7.4, §12.3)** — `search_projects`
   and `search_folders` moved into the builder-gated section; builder
   split corrected from "9/16" to "10/15"; degradation table added.
3. **`/n8n:debug-execution` contract (§8.3)** — rewritten because
   `get_execution` requires both `workflowId` and `executionId` with
   no MCP way to list executions. Skill now requires a user-supplied
   ID or a monitor handoff.
4. **`/n8n:run-workflow` mode handling (§8.2)** — added draft-vs-
   `activeVersion` divergence warning, explicit manual-mode switch,
   multi-trigger disambiguation, and watchlist registration.
5. **`availableInMCP` as first-class (§7.1, §8.2, §8.4, §8.6, §8.7,
   §14.4)** — enforced by `workflow-validation.utils.ts:61` on all
   action tools. Every action skill now filters + surfaces remediation
   copy pointing at Settings → MCP.
6. **`/n8n:update-workflow` scope (§8.7)** — narrowed to
   AI-generated workflows; explicit caveat about full-replacement,
   credential preservation (best-effort on name+type match), and
   HTTP node skip in `credentials-auto-assign.ts`.
7. **`publish_workflow` output (§7.3, §8.6)** — clarified it does NOT
   return webhook URLs; skill now does a follow-up
   `get_workflow_details` for webhook-triggered workflows.
8. **`search_workflows` output (§8.4)** — no trigger type returned;
   list skill no longer claims it shows one by default.
9. **Monitor auth (§5, §9a.1, §14.4)** — rewritten around n8n Public
   API (not MCP API). `n8n_api_key` → `n8n_public_api_key`. Added
   `n8n_public_api_path` for instances overriding
   `N8N_PUBLIC_API_ENDPOINT`. Added `execution:read` scope requirement
   and public-API-disabled fallback.
10. **Queue-mode cancellation (§9a.1)** — added to monitor policy
    table, citing `execution-utils.ts:55` note about
    `ScalingService.stopJob()` requiring an unavailable Bull reference.
11. **Scope string accuracy (§12.4, §14.4)** — removed fabricated
    `workflow:read`/`workflow:update` references. Documented actual
    `SUPPORTED_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails']`
    caveat and the fact that `verifyAccessToken()` currently returns
    `scopes: []`.
12. **Success metrics (§15)** — rewritten as a table marking each
    metric's instrumentation status. Called out
    `USER_CALLED_MCP_TOOL_EVENT` lacks `client_name` today and
    proposed Option (a) middleware-side fix.
13. **Phase 0 feasibility spikes (§11)** — added a new phase before
    Phase 1 because the existing in-repo plugin at
    `.claude/plugins/n8n/` doesn't exercise `.mcp.json`, `monitors/`,
    or `output-styles/` — none of the plugin-schema paths this plan
    relies on are proven yet.

No critique item was refuted — all twelve were grounded in accurate
codebase references and resulted in substantive revisions.

### Round 2 — external critique (codex exec)

Round 1 fixed the surface issues but introduced a handful of new ones
and left others under-specified. Round 2 caught these:

1. **Debug skill still broken** — §8.3 said "if only execution ID is
   given, call `search_workflows` to find the owning workflow," but
   `search_workflows` only searches name/description
   (`workflow.repository.ts:applyNameFilter`). The skill is now
   strict: **both `workflowId` and `executionId` are required**, and
   every handoff (run, test, monitor) includes both.
2. **Run-workflow execution-mode framing was wrong** — Round 1 treated
   `manual` vs `production` as a trigger-type choice. It's a
   **version** choice: `executionMode: 'manual'` runs the draft
   (all trigger types including unpublished); `executionMode: 'production'`
   runs `activeVersion` (manual triggers excluded). Rewritten to match
   `execute-workflow.tool.ts:224 getVersionDataForExecution`.
3. **Multi-trigger disambiguation claim was not implementable** —
   `execute_workflow` has no trigger selector; `findMcpSupportedTrigger()`
   always picks the first supported trigger. §8.2 now refuses
   multi-trigger workflows entirely rather than pretending to offer
   a selector.
4. **Run vs test conflation** — Round 1's run skill description said
   "execute, trigger, or test" but the flow called `execute_workflow`
   (open-world). Split: §8.2 run-workflow is live execution only,
   new §8.8 `/n8n:test-workflow` wraps `prepare_test_pin_data` +
   `test_workflow`.
5. **Monitor path probe hit wrong scope** — Round 1 probed
   `GET /executions` (collection), which requires `execution:list`;
   the monitor only requires `execution:read`. Rewritten to probe
   per-ID route with a sentinel ID.
6. **TTL justification wrong** — Round 1 said 1-hour TTL matches
   n8n's default production timeout. Actual
   `ExecutionsConfig.timeout` default is `-1` (unlimited). Reframed
   as a plugin-side ceiling, not an n8n default.
7. **`meta.builderCodeHash` doesn't exist** — replaced with
   `meta.aiBuilderAssisted` (verified in
   `create-workflow-from-code.tool.ts` and `update-workflow.tool.ts`),
   flagged as heuristic not proof.
8. **Publish-workflow versionId was a foot-gun** — `get_workflow_details`
   reads from draft `workflow.nodes`, not the `versionId` being
   activated, so pre-publish summaries and post-publish webhook URLs
   could be wrong for historical versions. §8.6 narrowed to
   current-draft-only for v1.
9. **Permissions table was aspirational, not real** — Round 1 listed
   `publish_workflow`, `create_*`, and most data-table writes as
   per-invocation approval. Actual annotations are
   `destructiveHint: false` for most of them. §12.5 rewritten to show
   the real table and added a pre-launch action item to tighten
   server-side annotations.
10. **ID vs name input handling** — all workflow-referencing skills
    now special-case ID-shaped input (skip `search_workflows`, go
    straight to `get_workflow_details`), since `search_workflows`
    cannot resolve IDs.
11. **Small copy regression** — §9a.1 said the "build skill surfaces
    the missing-key hint." Corrected to run/test skills, which own
    the watchlist registration.

All eleven Round 2 items were grounded in verifiable codebase
references and resulted in substantive revisions. No item refuted.

### Round 3 — external critique (codex exec)

Round 2 caught most of the remaining issues but left three gaps:

1. **ID fast-path missed in §8.6 and §8.7** — Round 2 added ID
   short-circuiting to §8.2 and §8.8 but not to publish/update.
   Applied the same pattern to both: if `$ARGUMENTS` is an ID, skip
   `search_workflows` and go straight to `get_workflow_details`.
2. **Multi-trigger refusal wasn't version-aware** — Round 2's §8.2
   refused multi-trigger workflows *before* choosing execution mode,
   but triggers must be counted on the node set the chosen mode will
   actually execute (draft for `manual`, `activeVersion.nodes` for
   `production`). Reordered the steps: choose mode first, then check
   triggers on the relevant set.
3. **Monitor probe over-trusted `404`** — Round 2's probe treated
   any `404` as "correct path with missing execution," but
   `server.ts:405-435` rewrites unknown GETs to `index.html` and the
   public API routes aren't registered when disabled
   (`public-api/index.ts:232-233`). Added a content-type +
   shape-based discriminator: accept `404` only when the response is
   `application/json` with an n8n-shaped error body; reject HTML
   fallbacks; surface scope errors explicitly on `401`/`403`.

Three substantive items, all backed by code references, all applied.
No items refuted.

### Round 4 — external critique (codex exec)

Round 3 landed cleanly in every area except one: the monitor probe
conflated `401` (auth failure) with `403` (scope failure).
`ApiKeyAuthStrategy.authenticate()` rejects missing/invalid keys
before any scope check, while `publicApiScope()` only emits `403`
after auth succeeds. Split the remediation copy and probe handling so
`401` surfaces "refresh your key" and `403` surfaces "key missing
`execution:read`." One fix, one error-copy split, convergence
confirmed by round 5.

### Round 6 — implementation findings (v0.1 plugin scaffold)

Built a v0.1 plugin (everything in this plan except the monitor) at
`n8n-claude-plugin/` and ran `claude plugin validate`. Two plan
claims were wrong and got corrected against the real validator:

1. **`userConfig` schema requires `type` and `title`** — the plan
   previously claimed the schema was only `description` and
   `sensitive`. Validator rejects that; real required keys are
   `type` (`string`/`number`/`boolean`/`directory`/`file`) and
   `title`. Plan §5 now documents the correct schema and the
   example manifest has been updated with both fields on all three
   userConfig entries.
2. **`argument-hint` values containing `[brackets]` parse as YAML
   flow sequences** — `argument-hint: [workflow name]` parses fine
   as `["workflow name"]` but `argument-hint: [a] [b]` breaks the
   YAML parser. All skill `argument-hint` values in the shipped
   plugin are quoted as strings. Plan §8 examples should follow
   the same convention in any future revision.

No other plan claim needed fixing during the build. v0.1 validates
cleanly and is ready for local testing via
`claude --plugin-dir ./n8n-claude-plugin`.
