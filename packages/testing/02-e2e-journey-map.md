# E2E Journey Map

Status: Source-backed journey draft. Existing E2E tests have not been inspected.
Date: 2026-05-19

## Inputs

- `packages/testing/01-product-feature-inventory.md`
- Product source under `packages/frontend/editor-ui/src`
- Backend source under `packages/cli/src`
- Runtime source under `packages/core/src` and `packages/workflow/src`
- Node registries under `packages/nodes-base` and `packages/@n8n/nodes-langchain`

## Scope

This file normalizes the source-backed feature inventory into journey domains. It is intentionally created before inspecting existing E2E, Playwright, Cypress, or test fixture files.

The journey inventory below has two layers: domain-level journey families and concrete journey candidates. The concrete candidates were drafted from source-backed subagent passes and still do not reference existing E2E files.

## Actor Groups

- Builder: creates, edits, tests, activates, and maintains workflows, credentials, data tables, AI agents, and related resources.
- Collaborator: works inside shared projects, shared resources, folders, workflow locks, comments/presence-style collaboration surfaces, and constrained permissions.
- Admin: configures users, roles, security policies, identity providers, license-gated features, projects, and enterprise controls.
- Operator: runs and maintains self-hosted or cloud operations, including workers, queue mode, source control, log streaming, audits, metrics, and instance health.
- API user: uses public API, webhook endpoints, OAuth endpoints, MCP endpoints, embedded chat, or automation interfaces outside the editor UI.
- AI user: uses Instance AI, AI Assistant, Chat Hub, agents, AI workflow builder, AI node catalog features, or model/provider configuration.
- External end user: interacts with public workflow surfaces such as forms, hosted chat, webhooks, OAuth consent, or published public endpoints.

## Journey Domains

| Domain | Actor Groups | Inventory Sections | Product Outcomes | Source Anchors |
| --- | --- | --- | --- | --- |
| D01 Account and first run | Builder, Collaborator, Admin, External end user | 1, 19, 20, 29 | A user can initialize an instance, authenticate, recover access, satisfy MFA/SSO requirements, and reach the correct authenticated or unauthenticated route. | `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/controllers/`, `packages/@n8n/api-types/src/` |
| D02 App shell and navigation | Builder, Collaborator, Admin, Operator, AI user | 2, 3, 18, 29 | A user can orient in the product, navigate between personal/shared/project contexts, use global creation/discovery entry points, and see stateful navigation indicators. | `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`, `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`, `packages/frontend/editor-ui/src/app/moduleInitializer/` |
| D03 Resource organization | Builder, Collaborator, Admin | 3, 4, 11, 12, 13, 14, 29 | A user can find, create, organize, move, share, favorite, archive, and delete workflows, credentials, folders, projects, variables, data tables, and agents. | `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`, `packages/cli/src/controllers/` |
| D04 Workflow creation and authoring | Builder, Collaborator, AI user | 4, 5, 6, 7, 10, 24, 25, 26, 29 | A builder can create or import a workflow, add and arrange nodes, connect steps, edit parameters, use expressions, handle canvas state, and save a valid workflow. | `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/frontend/editor-ui/src/features/ndv/`, `packages/workflow/src/` |
| D05 Node configuration and credentials | Builder, Collaborator, Admin | 6, 7, 11, 12, 23, 25, 26, 29 | A builder can discover node capabilities, configure parameters, create/test/reconnect credentials, use dynamic options, and keep secrets/redacted values safe. | `packages/frontend/editor-ui/src/features/ndv/`, `packages/cli/src/credentials/`, `packages/nodes-base/nodes/`, `packages/@n8n/nodes-langchain/nodes/` |
| D06 Execution and debugging | Builder, Collaborator, Operator, API user, External end user | 7, 8, 24, 25, 26, 27, 29 | A workflow can run manually or through triggers, show live execution state, expose run data safely, support retries/stops/debugging, and handle failed/waiting/partial executions. | `packages/frontend/editor-ui/src/features/ndv/`, `packages/cli/src/executions/`, `packages/core/src/`, `packages/workflow/src/` |
| D07 Templates and onboarding | Builder, AI user | 6, 10, 16, 18, 29 | A builder can discover templates or generated starting points, import them, satisfy credential setup, and reach an editable workflow with useful recommendations. | `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`, `packages/cli/src/controllers/` |
| D08 Data tables and variables | Builder, Collaborator, API user | 12, 13, 24, 25, 27, 29 | A user can model tabular data and variables, update records/schema, import/export CSV, reference values from workflows, and access the same resources through APIs. | `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`, `packages/cli/src/controllers/`, `packages/@n8n/api-types/src/`, `packages/nodes-base/nodes/` |
| D09 AI, agents, chat, and MCP | Builder, AI user, Admin, API user, External end user | 14, 15, 16, 17, 26, 27, 29 | A user can build and run agents, use chat and Instance AI surfaces, configure providers/tools/MCP access, and interact through public or embedded AI endpoints. | `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`, `packages/@n8n/instance-ai`, `packages/@n8n/nodes-langchain/nodes/`, `packages/cli/src/modules/` |
| D10 Collaboration and permissions | Builder, Collaborator, Admin | 3, 4, 5, 11, 19, 20, 21, 29 | Multiple users can work across projects and shared resources with correct role gates, locks, transfers, membership changes, and read-only states. | `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/controllers/`, `packages/cli/src/modules/`, `packages/@n8n/api-types/src/` |
| D11 Admin, identity, security, and enterprise | Admin, Operator, Builder, Collaborator | 1, 19, 20, 21, 22, 28, 29 | Admins can manage users, roles, identity providers, licensing, security policies, data redaction, API keys, audits, and environment-managed enterprise settings. | `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`, `packages/cli/src/controllers/`, `packages/cli/src/modules/`, `packages/cli/src/commands/` |
| D12 Operations, source control, workers, and public API | Operator, Admin, API user, Builder | 18, 21, 22, 23, 24, 27, 28, 29 | Operators and API users can maintain instances, source-controlled environments, workers, log streams, public APIs, community nodes, CLI tasks, and external automation surfaces. | `packages/cli/src/commands/`, `packages/cli/src/public-api/v1/`, `packages/cli/src/modules/`, `packages/core/src/`, `packages/workflow/src/` |

### Inventory Section Mapping

| Inventory Section | Primary Domain Mapping |
| --- | --- |
| 1. Account, Auth, And First Run | D01 Account and first run; D11 Admin, identity, security, and enterprise |
| 2. App Shell, Navigation, And Discovery | D02 App shell and navigation |
| 3. Home, Projects, Shared Spaces, And Resource Organization | D03 Resource organization; D10 Collaboration and permissions; D02 App shell and navigation |
| 4. Workflow Library | D03 Resource organization; D04 Workflow creation and authoring; D10 Collaboration and permissions |
| 5. Workflow Editor And Canvas | D04 Workflow creation and authoring; D10 Collaboration and permissions |
| 6. Node Creator And Node Selection | D04 Workflow creation and authoring; D05 Node configuration and credentials; D07 Templates and onboarding |
| 7. Node Details View And Node Configuration | D05 Node configuration and credentials; D06 Execution and debugging; D04 Workflow creation and authoring |
| 8. Workflow Execution And Debugging | D06 Execution and debugging |
| 9. Workflow History, Versions, And Publishing Timeline | D04 Workflow creation and authoring; D06 Execution and debugging; D10 Collaboration and permissions |
| 10. Templates, Onboarding, And Ready-To-Run Workflows | D07 Templates and onboarding; D04 Workflow creation and authoring |
| 11. Credentials, OAuth, And Connection Setup | D05 Node configuration and credentials; D03 Resource organization; D10 Collaboration and permissions |
| 12. External Secrets, Variables, And Encryption Keys | D08 Data tables and variables; D05 Node configuration and credentials; D11 Admin, identity, security, and enterprise |
| 13. Data Tables | D08 Data tables and variables; D03 Resource organization |
| 14. Agents | D09 AI, agents, chat, and MCP; D03 Resource organization |
| 15. Chat Hub | D09 AI, agents, chat, and MCP |
| 16. Instance AI And AI Assistant | D09 AI, agents, chat, and MCP; D07 Templates and onboarding |
| 17. MCP Access And MCP Server | D09 AI, agents, chat, and MCP; D12 Operations, source control, workers, and public API |
| 18. Insights, Usage, Telemetry, And Feedback | D02 App shell and navigation; D12 Operations, source control, workers, and public API; D07 Templates and onboarding |
| 19. Users, Roles, Permissions, And Security Settings | D11 Admin, identity, security, and enterprise; D10 Collaboration and permissions; D01 Account and first run |
| 20. Enterprise Auth And Provisioning | D11 Admin, identity, security, and enterprise; D01 Account and first run; D10 Collaboration and permissions |
| 21. Source Control, Environments, And Release Operations | D12 Operations, source control, workers, and public API; D10 Collaboration and permissions; D11 Admin, identity, security, and enterprise |
| 22. Log Streaming, Workers, And Operations | D12 Operations, source control, workers, and public API; D11 Admin, identity, security, and enterprise |
| 23. Community Nodes And Extensibility | D12 Operations, source control, workers, and public API; D05 Node configuration and credentials |
| 24. Runtime Engine And Workflow Semantics | D06 Execution and debugging; D04 Workflow creation and authoring; D08 Data tables and variables; D12 Operations, source control, workers, and public API |
| 25. Built-In Node Catalog Capabilities | D04 Workflow creation and authoring; D05 Node configuration and credentials; D06 Execution and debugging; D08 Data tables and variables |
| 26. AI/LangChain Node Catalog Capabilities | D09 AI, agents, chat, and MCP; D04 Workflow creation and authoring; D05 Node configuration and credentials; D06 Execution and debugging |
| 27. Public API And Automation Interfaces | D12 Operations, source control, workers, and public API; D06 Execution and debugging; D08 Data tables and variables; D09 AI, agents, chat, and MCP |
| 28. CLI And Self-Hosted Operations | D12 Operations, source control, workers, and public API; D11 Admin, identity, security, and enterprise |
| 29. Cross-Cutting Product States To Model Later | All domains, as state variants and permission/environment lenses |

## Journey Inventory

### D01 Account and first run

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D01-J01 | Owner initializes a fresh instance, creates the owner account, and reaches the authenticated app. | Admin | Inventory sections 1, 19; `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/controllers/` |
| D01-J02 | User signs in, signs out, is routed away from guest-only screens, and returns to the intended authenticated route. | Builder, Collaborator | Inventory section 1; `packages/frontend/editor-ui/src/app/router.ts` |
| D01-J03 | User recovers access through forgot-password, reset-password, and change-password flows. | Builder, Collaborator | Inventory section 1; `packages/cli/src/controllers/`, `packages/@n8n/api-types/src/` |
| D01-J04 | User satisfies MFA setup, enforced-MFA prompt, verification, recovery-code, and disable flows. | Builder, Admin | Inventory sections 1, 19; `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/controllers/` |
| D01-J05 | User enters through SAML/OIDC/LDAP or MCP OAuth consent and reaches the correct post-auth destination. | Admin, External end user | Inventory sections 1, 17, 20; `packages/cli/src/modules/`, `packages/cli/src/controllers/` |

### D02 App shell and navigation

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D02-J01 | User navigates between Home, Personal, Shared, Projects, Settings, Insights, Templates/Resource Center, Instance AI, and Chat. | Builder, AI user | Inventory section 2; `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` |
| D02-J02 | User changes sidebar state, persists width/collapse behavior, and sees overflow/bottom-menu behavior remain usable. | Builder | Inventory section 2; `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` |
| D02-J03 | User creates resources from global/project entry points and lands in the correct resource context. | Builder | Inventory sections 2, 3; `packages/frontend/editor-ui/src/app/router.ts` |
| D02-J04 | User uses discovery/support surfaces such as help, about/version, recent resources, command-bar resource registry, and feature-gated navigation. | Builder, Operator | Inventory sections 2, 18; `packages/frontend/editor-ui/src/app/moduleInitializer/` |

### D03 Resource organization

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D03-J01 | User manages personal, shared, and team project resource lists for workflows, credentials, folders, variables, data tables, and agents. | Builder, Collaborator | Inventory sections 3, 4, 11, 13, 14; `packages/frontend/editor-ui/src/app/router.ts` |
| D03-J02 | User creates, edits, favorites, archives, duplicates, imports, exports, transfers, and deletes workflows from library contexts. | Builder | Inventory section 4; `packages/cli/src/workflows/` |
| D03-J03 | User creates, nests, moves, transfers, and deletes folders with breadcrumb and folder-aware listing behavior. | Builder, Collaborator | Inventory section 3; `packages/cli/src/controllers/` |
| D03-J04 | User moves resources between projects, handles share-target discovery, and sees project metadata/ownership update. | Builder, Admin | Inventory sections 3, 4, 11; `packages/@n8n/api-types/src/` |
| D03-J05 | User manages agent, data-table, credential, variable, and workflow resources consistently across home and project contexts. | Builder, AI user | Inventory sections 11, 12, 13, 14; `packages/frontend/editor-ui/src/features/**/module.descriptor.ts` |

### D04 Workflow creation and authoring

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D04-J01 | Builder creates a new workflow, adds trigger/action nodes, connects them, edits metadata, and saves the first version. | Builder | Inventory sections 4, 5, 6, 7; `packages/frontend/editor-ui/src/app/views/NodeView.vue` |
| D04-J02 | Builder edits an existing workflow with canvas pan/zoom, selection, movement, duplication, copy/paste, tidy layout, sticky notes, and dirty-state handling. | Builder | Inventory section 5; `packages/frontend/editor-ui/src/features/workflows/canvas/` |
| D04-J03 | Builder imports workflow JSON, URL, clipboard, file, demo, or template content onto the current canvas. | Builder | Inventory sections 4, 5, 10; `packages/frontend/editor-ui/src/app/views/NodeView.vue` |
| D04-J04 | Builder edits node parameters, expressions, resource locators, filters, assignments, and dynamic input/output changes from the node details view. | Builder | Inventory section 7; `packages/frontend/editor-ui/src/features/ndv/` |
| D04-J05 | Builder manages workflow settings, activation state, production checklist, dependency warnings, and activation conflicts. | Builder | Inventory sections 4, 5, 24; `packages/cli/src/workflows/`, `packages/workflow/src/` |
| D04-J06 | Builder views history, compares versions, restores a version, names versions, and handles publish/unpublish timeline states. | Builder, Collaborator | Inventory section 9; `packages/cli/src/workflows/` |

### D05 Node configuration and credentials

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D05-J01 | Builder searches node creator categories, recommendations, community entries, unavailable nodes, and AI-specific node families. | Builder, AI user | Inventory sections 6, 23, 25, 26; `packages/nodes-base/nodes/`, `packages/@n8n/nodes-langchain/nodes/` |
| D05-J02 | Builder configures simple and complex node parameters, validates input, previews expressions, and sees invalid-node warnings. | Builder | Inventory section 7; `packages/frontend/editor-ui/src/features/ndv/`, `packages/workflow/src/` |
| D05-J03 | Builder creates, selects, edits, tests, reconnects, shares, transfers, and deletes credentials from node and credential-list contexts. | Builder, Collaborator | Inventory section 11; `packages/cli/src/credentials/` |
| D05-J04 | Builder completes OAuth1/OAuth2 callbacks, refresh/reconnects credentials, and uses quick-connect/dynamic credential flows. | Builder, External end user | Inventory section 11; `packages/cli/src/controllers/` |
| D05-J05 | Admin or builder configures external secret providers, variable-backed credentials, resolver-backed credentials, redaction, and encryption-key rotation. | Admin, Builder | Inventory section 12; `packages/cli/src/modules/`, `packages/cli/src/credentials/` |
| D05-J06 | Operator installs, updates, manages, or removes community node packages and verifies node discovery in authoring surfaces. | Operator, Builder | Inventory section 23; `packages/cli/src/modules/`, `packages/nodes-base/package.json` |

### D06 Execution and debugging

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D06-J01 | Builder manually executes a workflow, observes push-based execution state, inspects per-node output, and stops a running execution. | Builder | Inventory sections 7, 8, 24; `packages/cli/src/executions/`, `packages/core/src/` |
| D06-J02 | Builder executes a single node or runs to a selected node with pin-data substitution, partial reruns, and dirty-subgraph behavior. | Builder | Inventory sections 7, 8, 24; `packages/core/src/`, `packages/workflow/src/` |
| D06-J03 | Builder debugs from a previous execution, retries failed work, follows sub-execution links, and handles error/waiting/unfinished states. | Builder | Inventory section 8; `packages/cli/src/executions/` |
| D06-J04 | User reviews global, project, and workflow execution lists with filters, refresh, annotations, retry, stop, delete, and preview-panel behavior. | Builder, Operator | Inventory section 8; `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/executions/` |
| D06-J05 | External trigger executes a production/test webhook, form, chat, scheduled, trigger, retry, error, or sub-workflow path and records correct run data. | External end user, API user | Inventory sections 24, 25, 26, 27; `packages/core/src/`, `packages/workflow/src/` |
| D06-J06 | Builder inspects run data across JSON, table, binary, HTML, markdown, parsed AI content, schema preview, redacted data, and binary download/preview states. | Builder | Inventory section 7; `packages/frontend/editor-ui/src/features/ndv/` |

### D07 Templates and onboarding

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D07-J01 | Builder searches templates, opens template detail/collection pages, and imports a template onto the canvas. | Builder | Inventory section 10; `packages/frontend/editor-ui/src/app/router.ts` |
| D07-J02 | Builder starts from ready-to-run, demo, personalized, recommended, or AI starter workflows and reaches credential setup or editable workflow state. | Builder, AI user | Inventory sections 10, 16, 18; `packages/frontend/editor-ui/src/features/**/module.descriptor.ts` |
| D07-J03 | Builder completes template credential setup, resolves missing credential notices, and saves a usable workflow. | Builder | Inventory sections 10, 11; `packages/cli/src/credentials/` |
| D07-J04 | New user follows workflow onboarding and resource-center/template-discovery entry points to a first meaningful workflow. | Builder | Inventory sections 2, 10, 18; `packages/frontend/editor-ui/src/app/moduleInitializer/` |

### D08 Data tables and variables

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D08-J01 | Builder creates a data table, edits typed columns, reorders schema, and manages row CRUD/bulk operations. | Builder | Inventory section 13; `packages/@n8n/api-types/src/`, `packages/cli/src/controllers/` |
| D08-J02 | Builder imports CSV, validates size/storage limits, filters/sorts/paginates data, and exports CSV. | Builder | Inventory section 13; `packages/frontend/editor-ui/src/features/**/module.descriptor.ts` |
| D08-J03 | Builder creates, edits, filters, completes, and deletes variables and sees autocomplete/completion behavior in expressions. | Builder | Inventory section 12; `packages/workflow/src/` |
| D08-J04 | Workflow reads/writes data table records through nodes and branch write-access middleware. | Builder, API user | Inventory sections 13, 25, 27; `packages/nodes-base/nodes/`, `packages/cli/src/public-api/v1/` |
| D08-J05 | API user manages variables, data tables, columns, rows, and aggregate/list behavior through public APIs. | API user | Inventory sections 13, 27; `packages/cli/src/public-api/v1/` |

### D09 AI, agents, chat, and MCP

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D09-J01 | AI user creates an agent, configures identity/capabilities/tools/skills/memory/triggers, previews sessions, and publishes/unpublishes it. | AI user, Builder | Inventory section 14; `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/modules/` |
| D09-J02 | AI user chats with personal/workflow agents, manages conversations, providers, models, tools, attachments, and artifacts. | AI user | Inventory section 15; `packages/frontend/editor-ui/src/features/**/module.descriptor.ts` |
| D09-J03 | AI user uses Instance AI thread, messages, confirmation, artifacts, previews, memory, setup modals, and domain-access approvals. | AI user | Inventory section 16; `packages/@n8n/instance-ai`, `packages/cli/src/modules/` |
| D09-J04 | Builder uses AI workflow builder or Ask AI to generate or modify workflows, review diffs, apply suggestions, and complete setup cards. | Builder, AI user | Inventory section 16; `packages/frontend/editor-ui/src/app/views/NodeView.vue` |
| D09-J05 | Admin or API user configures MCP access, API keys, OAuth clients, workflow availability, consent, and MCP streamable HTTP/tool endpoints. | Admin, API user | Inventory section 17; `packages/cli/src/modules/`, `packages/cli/src/controllers/` |
| D09-J06 | Builder configures AI/LangChain nodes for agents, model providers, embeddings, vector stores, memory, tools, guardrails, output parsers, and MCP nodes. | Builder, AI user | Inventory section 26; `packages/@n8n/nodes-langchain/nodes/` |

### D10 Collaboration and permissions

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D10-J01 | Admin creates a team project, manages project settings, members, roles, quotas, and deletion. | Admin | Inventory sections 3, 19; `packages/cli/src/controllers/`, `packages/@n8n/api-types/src/` |
| D10-J02 | Collaborator opens shared workflows/credentials and experiences correct project role gates, read-only mode, sharing, and transfer behavior. | Collaborator | Inventory sections 3, 4, 11, 19; `packages/frontend/editor-ui/src/app/router.ts` |
| D10-J03 | Multiple users edit or view the same workflow with presence, write locks, active-editor state, and acquire-editing behavior. | Builder, Collaborator | Inventory sections 3, 5; `packages/frontend/editor-ui/src/features/workflows/canvas/` |
| D10-J04 | Admin changes global/project roles, custom role scopes, assignments, and role mapping rules and sees impact on affected resources. | Admin | Inventory sections 19, 20; `packages/cli/src/modules/` |
| D10-J05 | Source-control or environment read-only states constrain edits while keeping resource browsing and pull/push status understandable. | Collaborator, Operator | Inventory section 21; `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`, `packages/cli/src/modules/` |

### D11 Admin, identity, security, and enterprise

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D11-J01 | Admin invites, reinvites, updates, deletes, or transfers/deletes data for users. | Admin | Inventory section 19; `packages/cli/src/controllers/` |
| D11-J02 | Admin configures SAML, OIDC, LDAP, provisioning, role mapping, and environment-managed locks. | Admin | Inventory section 20; `packages/cli/src/modules/` |
| D11-J03 | Admin manages license activation, enterprise trial, Community Plus/EULA, feature gates, limits, and upgrade prompts. | Admin | Inventory section 20; `packages/cli/src/commands/`, `packages/cli/src/modules/` |
| D11-J04 | Admin creates, scopes, edits, and deletes API keys and verifies API-key auth behavior. | Admin, API user | Inventory sections 19, 27; `packages/cli/src/public-api/v1/` |
| D11-J05 | Admin configures security settings such as enforced MFA, personal-space sharing, publishing policies, redaction, reveal auditing, and password policy. | Admin | Inventory section 19; `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`, `packages/cli/src/modules/` |
| D11-J06 | Operator or admin runs audit/security reports and reviews risk categories or operational health signals. | Operator, Admin | Inventory sections 22, 28; `packages/cli/src/commands/` |

### D12 Operations, source control, workers, and public API

| ID | Journey Family | Primary Actor | Source Anchors |
| --- | --- | --- | --- |
| D12-J01 | Operator connects source control, generates keys, selects branch, reviews status, pulls, pushes, and handles read-only branch mode. | Operator, Admin | Inventory section 21; `packages/cli/src/modules/` |
| D12-J02 | Operator configures log streaming destinations, event groups, tests destinations, and handles environment-managed destination state. | Operator | Inventory section 22; `packages/cli/src/modules/` |
| D12-J03 | Operator monitors worker status, running jobs, process/host/network/version details, queue mode, orchestration, concurrency, and capacity behavior. | Operator | Inventory section 22; `packages/cli/src/modules/`, `packages/core/src/` |
| D12-J04 | API user discovers public API capabilities and manages workflows, executions, credentials, projects, tags, variables, source control, users, community packages, data tables, and insights. | API user | Inventory section 27; `packages/cli/src/public-api/v1/` |
| D12-J05 | Operator uses CLI commands to start server/webhook/worker processes, execute workflows, import/export data, publish/unpublish, audit, reset MFA/LDAP/user management, and inspect config/license state. | Operator | Inventory section 28; `packages/cli/src/commands/` |
| D12-J06 | Operator manages community nodes and custom node loading lifecycle from settings, npm utilities, filesystem packages, and hot reload/push behavior. | Operator, Builder | Inventory section 23; `packages/cli/src/modules/`, `packages/nodes-base/package.json` |
| D12-J07 | Runtime external surfaces support production/test webhooks, OAuth endpoints, binary retrieval, push/realtime channels, public chat, and MCP clients. | API user, External end user | Inventory sections 24, 27; `packages/core/src/`, `packages/workflow/src/`, `packages/cli/src/public-api/v1/` |

## Concrete Journey Candidates

These candidates are deduplicated by user goal. Variants are retained where they change risk, permissions, persistence, execution mode, or actor.

### D01 Account and first run

#### D01-CJ01 Owner setup

- Actor: Admin.
- Goal: Initialize a fresh instance and reach the authenticated app as owner.
- Preconditions: Instance has no owner account; setup route is available.
- Primary path: Open setup, enter owner details, complete first-run setup, land in the authenticated app.
- Variants: Setup already complete, invalid owner data, license or telemetry prompts, cloud vs self-host defaults.
- Success signal: Owner user exists, session is authenticated, guest-only setup routes are no longer reachable.
- Source anchors: Inventory sections 1, 19; `packages/frontend/editor-ui/src/app/router.ts`, `packages/cli/src/controllers/owner.controller.ts`, `packages/cli/src/controllers/auth.controller.ts`.

#### D01-CJ02 Sign in, sign out, and guarded routing

- Actor: Builder, Collaborator.
- Goal: Authenticate, return to the intended destination, and sign out cleanly.
- Preconditions: User account exists.
- Primary path: Open protected route, get redirected to sign-in, submit credentials, return to intended route, sign out.
- Variants: Guest-only route while signed in, disabled user, invalid password, SSO-only instance, session expiry.
- Success signal: Authenticated session is created and destroyed; route guards send the user to the correct destination.
- Source anchors: Inventory section 1; `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/core/auth/`, `packages/cli/src/controllers/auth.controller.ts`.

#### D01-CJ03 Password recovery and change

- Actor: Builder, Collaborator.
- Goal: Recover access and update a password without admin intervention.
- Preconditions: Password login is enabled; user email is known.
- Primary path: Request reset link, open reset token route, set a new password, sign in, change password from account settings.
- Variants: Expired token, SSO-managed user, password policy failure, first invited-user password setup.
- Success signal: New password works, stale token cannot be reused, account settings reflect the update.
- Source anchors: Inventory section 1; `packages/cli/src/controllers/password-reset.controller.ts`, `packages/cli/src/controllers/me.controller.ts`, `packages/@n8n/api-types/src/`.

#### D01-CJ04 MFA login and recovery

- Actor: Builder, Admin.
- Goal: Complete MFA setup, sign in with MFA, and retain recovery paths.
- Preconditions: User account exists; MFA is available or enforced.
- Primary path: Generate QR and recovery codes, verify TOTP, sign out, sign in with MFA challenge, use recovery code when needed.
- Variants: Enforced before setup, invalid token, recovery-code login, admin/CLI disable, environment-managed enforcement.
- Success signal: `mfaEnabled` changes, login requires MFA when enabled, recovery codes work once.
- Source anchors: Inventory sections 1, 19, 28; `packages/cli/src/controllers/mfa.controller.ts`, `packages/cli/src/mfa/`, `packages/cli/src/commands/mfa/disable.ts`.

#### D01-CJ05 Enterprise login entry

- Actor: Admin, Collaborator.
- Goal: Enter through SAML, OIDC, or LDAP and reach the correct post-auth destination.
- Preconditions: Enterprise identity provider is configured.
- Primary path: Start identity-provider login, complete provider challenge, return through n8n callback, land on app route.
- Variants: New user provisioning, role mapping, disabled local login, environment-managed auth settings, failed callback.
- Success signal: User is created or linked, correct roles are applied, post-auth routing succeeds.
- Source anchors: Inventory sections 1, 20; `packages/cli/src/modules/sso-saml/`, `packages/cli/src/modules/sso-oidc/`, `packages/cli/src/modules/ldap.ee/`.

### D02 App shell and navigation

#### D02-CJ01 Navigate product areas and resource contexts

- Actor: Builder, Collaborator, Admin, Operator, AI user.
- Goal: Move between core app areas without losing project or resource context.
- Preconditions: User is authenticated.
- Primary path: Use sidebar and header navigation for Home, Personal, Shared, Projects, Templates, Insights, Settings, Instance AI, Chat, and current workflow.
- Variants: Feature-gated items, project context, collapsed sidebar, unread/update indicators, cloud/self-host differences.
- Success signal: Active route, selected project, and visible navigation items match user permissions and feature availability.
- Source anchors: Inventory sections 2, 3, 18; `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`, `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`, `packages/frontend/editor-ui/src/app/router.ts`.

#### D02-CJ02 Create from global and scoped entry points

- Actor: Builder.
- Goal: Start the right resource from the right place.
- Preconditions: User has create permission for at least one resource type.
- Primary path: Use global create, project create, resource list create, or canvas add actions to create workflows, credentials, folders, data tables, variables, or agents.
- Variants: Personal vs team project, missing create scope, feature-gated resource type, default folder/project selection.
- Success signal: Created resource lands in the intended project or context and route updates accordingly.
- Source anchors: Inventory sections 2, 3, 4, 11, 13, 14; `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectCreateResource.vue`, `packages/frontend/editor-ui/src/app/views/CanvasAddButton.vue`, `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`, `packages/cli/src/controllers/`, `packages/cli/src/workflows/workflows.controller.ts`.

### D03 Resource organization

#### D03-CJ01 Workflow library management

- Actor: Builder, Collaborator.
- Goal: Maintain workflow resources outside the canvas.
- Preconditions: User can view workflow lists.
- Primary path: Open workflow library, search/filter, favorite, duplicate, import/export, archive/unarchive, transfer, or delete a workflow.
- Variants: Personal vs project workflow, archived workflow, missing ownership, selected folder, bulk actions, active workflow deletion.
- Success signal: Workflow list and server state reflect the action; protected operations enforce permissions.
- Source anchors: Inventory section 4; `packages/cli/src/workflows/`, `packages/frontend/editor-ui/src/app/api/workflows.ts`, `packages/frontend/editor-ui/src/app/api/workflows.ee.ts`.

#### D03-CJ02 Cross-resource organization

- Actor: Builder, Collaborator.
- Goal: Keep workflows, credentials, data tables, variables, and agents organized in personal, shared, and project spaces.
- Preconditions: Resources exist; user can view relevant spaces.
- Primary path: Navigate home/project/shared lists, search and filter resources, open details, move or transfer resources where allowed.
- Variants: Resource-specific permissions, project ownership, shared-with-me resource, deleted/archived resource, feature-gated resource type.
- Success signal: Resource appears in the correct list and route; ownership and project metadata are updated.
- Source anchors: Inventory sections 3, 4, 11, 12, 13, 14; `packages/frontend/editor-ui/src/app/router.ts`, `packages/frontend/editor-ui/src/features/collaboration/projects/`, `packages/cli/src/controllers/project.controller.ts`.

### D04 Workflow creation and authoring

#### D04-CJ01 Workflow creation

- Actor: Builder.
- Goal: Create a workflow from an empty canvas.
- Preconditions: Authenticated user with workflow create/update permission.
- Primary path: Open new workflow, add trigger and action nodes, connect them, configure minimal fields, save first version.
- Variants: Personal vs team project, autosave vs manual save, collaborator read-only or write lock, archived route.
- Success signal: Workflow has durable id, nodes, connections, checksum, and saved state.
- Source anchors: Inventory sections 4-7; `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/frontend/editor-ui/src/app/composables/useWorkflowSaving.ts`, `packages/cli/src/workflows/workflows.controller.ts`.

#### D04-CJ02 Workflow import

- Actor: Builder.
- Goal: Import existing workflow data into an editable workflow.
- Preconditions: User has create/update permission; valid source data is available.
- Primary path: Import from file, clipboard, URL, demo, or template; normalize onto canvas; select visible imported nodes; save.
- Variants: New vs existing workflow, invalid JSON or URL, import into dirty canvas, blocked URL import, missing credentials.
- Success signal: Imported nodes and connections render and persist after save.
- Source anchors: Inventory sections 4, 5, 10; `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/cli/src/workflows/workflows.controller.ts`.

#### D04-CJ03 Canvas editing

- Actor: Builder.
- Goal: Shape a workflow graph safely after nodes exist.
- Preconditions: Editable workflow with nodes.
- Primary path: Move, select, duplicate, copy, cut, paste, delete, enable/disable, pin, create/delete connections, tidy layout, and add sticky notes.
- Variants: Bulk vs single node, keyboard vs context menu, main vs non-main connection, sticky note editing, read-only canvas.
- Success signal: Canvas state reflects intended graph changes and dirty state is set.
- Source anchors: Inventory section 5; `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/frontend/editor-ui/src/app/views/NodeView.vue`.

#### D04-CJ04 Save and dirty state

- Actor: Builder.
- Goal: Keep workflow edits durable without losing work.
- Preconditions: Workflow has unsaved changes.
- Primary path: Edit workflow, save manually or by autosave, handle first-save redirect, leave-route prompt, checksum, and write-lock validation.
- Variants: Autosave enabled/disabled, first save vs update, AI Builder streaming pauses autosave, save from debug, archived/read-only/write-lock conflict.
- Success signal: Saved indicator, checksum, and version state update; leaving no longer prompts.
- Source anchors: Inventory sections 5, 9, 29; `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue`, `packages/cli/src/workflows/workflows.controller.ts`.

#### D04-CJ05 Publish and activation

- Actor: Builder.
- Goal: Make a workflow runnable and later unpublish it.
- Preconditions: Saved workflow; activatable trigger; publish/unpublish permission; no blocking node issues.
- Primary path: Click publish, optionally name/describe version, confirm active version, use version menu to unpublish.
- Variants: No trigger, node validation issues, personal-space restriction, missing permission, webhook conflict, published with changes, archived/read-only state.
- Success signal: `activeVersion` is set or cleared; publish indicator and server workflow state agree.
- Source anchors: Inventory sections 4, 5, 8, 9, 24; `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue`, `packages/frontend/editor-ui/src/app/composables/useWorkflowActivate.ts`, `packages/cli/src/workflows/workflows.controller.ts`.

#### D04-CJ06 Workflow history and versions

- Actor: Builder, Collaborator.
- Goal: Inspect, compare, restore, name, clone, publish, or unpublish workflow versions.
- Preconditions: Workflow has saved history; user can read workflow.
- Primary path: Open history, select version, preview or diff, take action from version menu, return to editor.
- Variants: Named versions licensed, diffs enabled, pruned history, archived workflow, update/publish permission, published timeline tab.
- Success signal: Selected version preview/diff loads; restore/clone/name/publish action changes durable workflow or version state.
- Source anchors: Inventory section 9; `packages/frontend/editor-ui/src/features/workflows/workflowHistory/`, `packages/cli/src/workflows/workflow-history/`.

### D05 Node configuration and credentials

#### D05-CJ01 Node discovery

- Actor: Builder.
- Goal: Find the right node/action and add it to the graph.
- Preconditions: Editable workflow; node types loaded.
- Primary path: Open node creator from empty canvas, add button, connection handle, or replacement action; search/category drilldown; select node/action.
- Variants: Trigger vs regular action, app/action mode, keyboard navigation, compatible non-main AI/tool connections, unavailable community node, no results.
- Success signal: Correct node is added, optionally auto-connected, and NDV/canvas state updates.
- Source anchors: Inventory sections 6, 23, 25, 26; `packages/frontend/editor-ui/src/features/shared/nodeCreator/`, `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/nodes-base/nodes/`, `packages/@n8n/nodes-langchain/nodes/`.

#### D05-CJ02 Node configuration

- Actor: Builder.
- Goal: Configure node parameters until the node is valid.
- Preconditions: Node exists and NDV is open.
- Primary path: Choose resource/operation, fill simple and complex parameters, use resource mapper/filter/assignment/expression inputs, handle dynamic parameter display.
- Variants: Read-only or foreign credential state, unsupported action, form/wait parameter transforms, invalid-node warnings, dynamic options loading.
- Success signal: Required issues clear, parameters persist, and inputs/outputs update.
- Source anchors: Inventory section 7; `packages/frontend/editor-ui/src/features/ndv/`, `packages/workflow/src/`.

#### D05-CJ03 Credential setup

- Actor: Builder.
- Goal: Create/select/test credentials while configuring a node.
- Preconditions: Node requires credentials; user has credential create/read scope.
- Primary path: Open credential selector from NDV, create or select credential, save, test/retest, assign to node.
- Variants: Manual vs OAuth/quick-connect, managed vs custom OAuth, external secrets, dynamic credentials/resolver warning, sharee read-only, credential deleted/renamed.
- Success signal: Credential is persisted, selected on node, and validation/test state is visible.
- Source anchors: Inventory sections 11, 12; `packages/frontend/editor-ui/src/features/credentials/`, `packages/cli/src/credentials/`, `packages/cli/src/controllers/oauth/`.

#### D05-CJ04 OAuth credential callback

- Actor: Builder, External end user.
- Goal: Complete OAuth credential setup and reconnect later.
- Preconditions: Credential type supports OAuth; callback URL is configured.
- Primary path: Start OAuth flow from credential editor, complete provider consent, return through callback, save credential, reconnect or refresh when needed.
- Variants: OAuth1 vs OAuth2, dynamic OAuth client registration, invalid state, provider denial, expired token, reconnect from node or credential list.
- Success signal: Credential stores usable OAuth data and credential test succeeds or fails with actionable state.
- Source anchors: Inventory section 11; `packages/frontend/editor-ui/src/features/credentials/composables/useCredentialOAuth.ts`, `packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/`, `packages/cli/src/controllers/oauth/oauth1-credential.controller.ts`, `packages/cli/src/controllers/oauth/oauth2-credential.controller.ts`, `packages/cli/src/oauth/`.

### D06 Execution and debugging

#### D06-CJ01 Manual workflow execution

- Actor: Builder.
- Goal: Run a workflow from the canvas and observe live results.
- Preconditions: Saved executable workflow; push connection active; execute permission.
- Primary path: Click run, select trigger if needed, backend starts manual run, push updates execution, inspect output, optionally stop.
- Variants: Unsaved autosave before run, single vs multiple triggers, webhook/form/chat waiting, binary mode mismatch, no push connection, disabled trigger.
- Success signal: Execution id/status appears; run data reaches nodes; stop/waiting state resolves visibly.
- Source anchors: Inventory sections 7, 8, 24; `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/cli/src/workflows/workflow-execution.service.ts`, `packages/cli/src/executions/`.

#### D06-CJ02 Node-level execution

- Actor: Builder.
- Goal: Test one node or run to a selected node.
- Preconditions: Workflow has target node; parent run data or pin data may exist.
- Primary path: Use NDV/node execute button, consolidate parent data or pin data, run destination node, inspect target output.
- Variants: Pinned-data unpin prompt, inclusive vs exclusive mode, trigger listen/fetch event, chat path, agent input modal, generated code before run.
- Success signal: Target node and required upstream nodes receive fresh run data; unrelated downstream nodes do not run; execution mode/status identifies a partial or manual run.
- Source anchors: Inventory sections 7, 8, 24; `packages/frontend/editor-ui/src/features/ndv/`, `packages/core/src/execution-engine/partial-execution-utils/`.

#### D06-CJ03 Run data inspection

- Actor: Builder.
- Goal: Understand execution output and preserve useful test data.
- Preconditions: Node has run data or pinned data.
- Primary path: Open NDV output, switch JSON/table/schema/HTML/markdown/AI/binary views, paginate/search/copy, pin/unpin, preview/download binary.
- Variants: Redacted production data, reveal-gated data, trimmed/large data, binary mode, sub-execution link, previous execution preview read-only.
- Success signal: Selected run/item renders correctly; pin/download/reveal actions respect state and permissions.
- Source anchors: Inventory sections 7, 8; `packages/frontend/editor-ui/src/features/ndv/runData/`, `packages/frontend/editor-ui/src/features/ndv/panel/components/RedactedDataState.vue`.

#### D06-CJ04 Execution debugging

- Actor: Builder.
- Goal: Reproduce or fix behavior from a previous execution.
- Preconditions: Existing execution; workflow read/update permission.
- Primary path: Open workflow executions, select execution, debug or copy to editor, load execution data in editor, adjust workflow, save and rerun.
- Variants: Failed vs successful execution, debug paywall, missing nodes, redacted data, retry current workflow vs original workflow.
- Success signal: Editor opens with execution context and supports a corrective save/rerun loop.
- Source anchors: Inventory section 8; `packages/frontend/editor-ui/src/features/execution/executions/`, `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/cli/src/executions/executions.controller.ts`.

#### D06-CJ05 Execution list operations

- Actor: Builder, Operator.
- Goal: Review and act on workflow, project, or global executions.
- Preconditions: Workflow or project has executions; user can read executions.
- Primary path: Open executions list, filter/select preview, stop/retry/delete/annotate as allowed.
- Variants: Running/waiting/success/error status, advanced filters licensed, annotation enabled, execute/update permission differences, concurrent execution count.
- Success signal: Stop/retry changes row status, deleted executions disappear or return not found, and annotations persist in both preview and list contexts.
- Source anchors: Inventory section 8; `packages/frontend/editor-ui/src/features/execution/executions/`, `packages/cli/src/executions/`.

#### D06-CJ06 Runtime webhooks

- Actor: API user, External end user.
- Goal: Call a workflow webhook and receive the configured response.
- Preconditions: Workflow has Webhook trigger; test listener or published workflow exists.
- Primary path: Builder exposes test/production URL, caller sends request, webhook handler resolves node/path/method, workflow executes from webhook node, response returns.
- Variants: Test vs production, static vs dynamic path, none/basic/header/JWT auth, CORS/IP allowlist, raw/multipart/binary body, immediate/last-node/respond-node/streaming.
- Success signal: HTTP status/body/headers match node config; execution is saved with webhook mode and run data.
- Source anchors: Inventory sections 24, 25, 27; `packages/cli/src/webhooks/`, `packages/nodes-base/nodes/Webhook/Webhook.node.ts`, `packages/nodes-base/nodes/RespondToWebhook/RespondToWebhook.node.ts`.

#### D06-CJ07 Public forms

- Actor: External end user.
- Goal: Submit an n8n-hosted form and see the correct completion outcome.
- Preconditions: Workflow has Form Trigger/Form nodes; public/test form URL is available.
- Primary path: Open form page, fill fields/upload file if configured, submit, workflow receives structured data, completion page/redirect/text/binary response renders.
- Variants: Test vs production, field-defined vs JSON-defined forms, file upload, completion node vs default completion, redirect vs HTML/text/binary, custom CSS/CSP.
- Success signal: Submitted values appear in execution data; user-visible completion, redirect, or binary response is correct.
- Source anchors: Inventory sections 24, 25, 27; `packages/cli/src/webhooks/waiting-forms.ts`, `packages/nodes-base/nodes/Form/`.

#### D06-CJ08 Wait and resume

- Actor: External end user, Builder.
- Goal: Pause execution and resume it from time, webhook, form, or approval link.
- Preconditions: Saved workflow reaches Wait or send-and-wait node; execution has waiting state/resume token.
- Primary path: Workflow runs until wait point, resume URL/form URL or signed action link is generated, external action arrives or timer fires, execution resumes from stored state.
- Variants: Time interval vs specific time vs webhook vs form, indefinite vs limited wait, resume token vs signed approval params, basic auth, leader/queue resumption, already-finished/running/error states.
- Success signal: Waiting execution moves to running/success; downstream nodes receive submitted or approval data.
- Source anchors: Inventory sections 24, 25; `packages/nodes-base/nodes/Wait/Wait.node.ts`, `packages/cli/src/webhooks/waiting-webhooks.ts`, `packages/cli/src/webhooks/waiting-forms.ts`, `packages/cli/src/wait-tracker.ts`.

#### D06-CJ09 Scheduled execution

- Actor: Builder, Operator.
- Goal: Run a published workflow on schedule without manual action.
- Preconditions: Workflow has Schedule/Cron trigger and is active.
- Primary path: Activation registers cron, scheduled tick emits trigger data, workflow starts with trigger mode, execution is persisted.
- Variants: Manual trigger preview vs active schedule, cron granularity, timezone, recurrence, deduplication key, leader-only ticking.
- Success signal: Execution appears at scheduled time with timestamp/timezone payload.
- Source anchors: Inventory sections 24, 25; `packages/nodes-base/nodes/Schedule/ScheduleTrigger.node.ts`, `packages/core/src/execution-engine/scheduled-task-manager.ts`, `packages/core/src/execution-engine/triggers-and-pollers.ts`, `packages/cli/src/active-workflow-manager.ts`.

#### D06-CJ10 Service-triggered execution

- Actor: External service, Operator.
- Goal: Start workflows from non-webhook triggers and pollers.
- Preconditions: Active workflow has trigger/poller node and required credentials/config.
- Primary path: Activation runs trigger or poller setup, external event/poll emits data, workflow executes from trigger node, static data may update.
- Variants: Trigger vs poller, service webhook registration vs local/SSE/queue/database trigger, activation failure, active version vs draft, credential failure.
- Success signal: Event creates execution with expected trigger data and durable status.
- Source anchors: Inventory sections 24, 25; `packages/core/src/execution-engine/triggers-and-pollers.ts`, `packages/cli/src/active-workflow-manager.ts`, `packages/nodes-base/nodes/`.

#### D06-CJ11 Error workflow handling

- Actor: Builder, Operator.
- Goal: Route failed executions into configured error handling workflow.
- Preconditions: Source workflow can fail; error workflow setting or Error Trigger exists.
- Primary path: Workflow errors, lifecycle hook builds workflow error payload, external/internal error workflow starts at Error Trigger, original execution context is included.
- Variants: Explicit error workflow vs internal Error Trigger, Stop and Error node vs runtime error, retry context, self-referential guard, subworkflow policy denial.
- Success signal: Error workflow execution is created with failed workflow/execution/error metadata.
- Source anchors: Inventory sections 24, 25; `packages/cli/src/execution-lifecycle/execute-error-workflow.ts`, `packages/cli/src/workflows/workflow-execution.service.ts`, `packages/nodes-base/nodes/ErrorTrigger/ErrorTrigger.node.ts`, `packages/nodes-base/nodes/StopAndError/StopAndError.node.ts`.

#### D06-CJ12 Sub-workflow execution

- Actor: Builder.
- Goal: Reuse a workflow as a callable sub-workflow and consume its results.
- Preconditions: Parent workflow has Execute Sub-workflow node; child has Execute Workflow Trigger or compatible input schema.
- Primary path: Parent maps input, child workflow runs, parent waits or continues, child result returns to parent output.
- Variants: Database vs JSON/file/URL source, once for all items vs each item, wait for completion vs async, caller policy any/same-owner/allowlist/none, waiting child resumes parent.
- Success signal: Parent execution output contains child results or clear policy error.
- Source anchors: Inventory sections 24, 25; `packages/nodes-base/nodes/ExecuteWorkflow/`, `packages/cli/src/executions/pre-execution-checks/subworkflow-policy-checker.ts`, `packages/cli/src/wait-tracker.ts`.

#### D06-CJ13 Binary data lifecycle

- Actor: External end user, Builder, API user.
- Goal: Ingest, store, inspect, return, and download binary data.
- Preconditions: Workflow creates binary data from webhook, form, file, or API response.
- Primary path: Binary payload enters workflow, node stores binary reference, downstream node reads/transforms/returns it, user views/downloads via endpoint or response.
- Variants: Memory/filesystem/database/object-store mode, signed vs authenticated retrieval, view vs download MIME rules, raw body, multipart upload, binary response.
- Success signal: Binary metadata and content are preserved; retrieval has correct headers/status and CSP.
- Source anchors: Inventory sections 7, 24, 25, 27; `packages/core/src/binary-data/binary-data.service.ts`, `packages/cli/src/controllers/binary-data.controller.ts`, `packages/nodes-base/nodes/Webhook/Webhook.node.ts`.

#### D06-CJ14 Expression evaluation

- Actor: Builder.
- Goal: Use expressions to read workflow data, variables, secrets, execution URLs, and paired items safely.
- Preconditions: Workflow has run data or pinned/manual data and expression-backed parameters.
- Primary path: Expression resolves through data proxy; sandbox/evaluator validates syntax and access; parameter value feeds node execution.
- Variants: `$json`, `$binary`, `$node`, `$workflow`, `$execution`, `$vars`, `$secrets`, paired-item traversal, pinned data, unavailable node data, evaluator mode.
- Success signal: Resolved values match current item/run context or produce user-facing expression errors.
- Source anchors: Inventory sections 7, 12, 24; `packages/workflow/src/workflow-expression.ts`, `packages/workflow/src/expression.ts`, `packages/workflow/src/expression-sandboxing.ts`, `packages/workflow/src/workflow-data-proxy.ts`.

#### D06-CJ15 Representative node execution

- Actor: Builder, API user.
- Goal: Verify representative node families preserve item semantics through common workflow patterns.
- Preconditions: Workflow contains HTTP/API, flow-control, transformation, or code nodes.
- Primary path: Execute API request, route/merge/transform data, optionally run custom JavaScript/Python, and inspect output item lineage.
- Variants: OAuth/basic/header auth, pagination, binary download, If/Switch/Merge/Set behavior, paired-item preservation, Code node mode, continue-on-fail.
- Success signal: Output data, branch selection, item count, paired lineage, binary data, or node error matches configuration.
- Source anchors: Inventory sections 24, 25, 26; `packages/core/src/execution-engine/`, `packages/core/src/execution-engine/node-execution-context/`, `packages/nodes-base/nodes/HttpRequest/`, `packages/nodes-base/nodes/If/`, `packages/nodes-base/nodes/Switch/`, `packages/nodes-base/nodes/Merge/`, `packages/nodes-base/nodes/Set/`, `packages/nodes-base/nodes/Code/`.

### D07 Templates and onboarding

#### D07-CJ01 Template start

- Actor: Builder.
- Goal: Start from a template and reach an editable workflow.
- Preconditions: Templates enabled; template repository reachable or handled as unavailable.
- Primary path: Search/filter templates, open template or collection, try template, complete credential setup if needed, create/import workflow.
- Variants: No-credential direct import, credential setup skipped, ready-to-demo pin data, recommended/personalized/AI starter/ready-to-run entry, endpoint error.
- Success signal: Workflow opens with template nodes, `meta.templateId`, credential overrides where provided, and saved workflow id when setup creates it.
- Source anchors: Inventory sections 10, 11, 16, 18; `packages/frontend/editor-ui/src/features/workflows/templates/`, `packages/cli/src/controllers/dynamic-templates.controller.ts`.

### D08 Data tables and variables

#### D08-CJ01 Data table CRUD and grid work

- Actor: Builder, Collaborator.
- Goal: Model tabular data and maintain rows from the UI.
- Preconditions: Project exists; user has data table scopes.
- Primary path: Create table, add/rename/move/delete columns, add/update/upsert/delete rows, filter/sort/search/paginate, bulk select.
- Variants: Project vs home context, viewer/no write scope, source-control branch read-only, validation/conflict errors.
- Success signal: Schema and rows persist; grid reflects filtered/sorted state.
- Source anchors: Inventory section 13; `packages/frontend/editor-ui/src/features/core/dataTable/`, `packages/cli/src/modules/data-table/data-table.controller.ts`, `packages/@n8n/api-types/src/`.

#### D08-CJ02 Data table CSV and workflow writes

- Actor: Builder, API user.
- Goal: Import/export data and use tables from workflows/nodes.
- Preconditions: Existing or new table; upload allowed; workflow can access project table.
- Primary path: Upload CSV, preview parsed columns, create/import, download CSV, execute Data Table node read/write operations.
- Variants: Headers on/off, storage warning/error, system columns, update/upsert dry run, branch write-access middleware.
- Success signal: Imported row count/export content is correct; workflow row operation succeeds.
- Source anchors: Inventory sections 13, 24, 25; `packages/cli/src/modules/data-table/`, `packages/nodes-base/nodes/DataTable/`, `packages/core/src/execution-engine/node-execution-context/utils/data-table-helper-functions.ts`.

#### D08-CJ03 Variables

- Actor: Builder, Collaborator.
- Goal: Manage scoped variables and use them in expressions.
- Preconditions: Variables feature is licensed for write operations.
- Primary path: List/filter variables, create/edit/delete key/value, view usage/scope/state, reference variable from expression/schema autocomplete.
- Variants: Project vs global variable, incomplete values, unlicensed write, project permission.
- Success signal: Variable persists and expression context/completion exposes it.
- Source anchors: Inventory section 12; `packages/frontend/editor-ui/src/features/collaboration/projects/views/ProjectVariables.vue`, `packages/frontend/editor-ui/src/features/settings/environments.ee/`, `packages/cli/src/environments.ee/variables/variables.controller.ee.ts`.

### D09 AI, agents, chat, and MCP

#### D09-CJ01 Instance AI threads

- Actor: AI user.
- Goal: Ask Instance AI to work on the instance and persist the conversation.
- Preconditions: Instance AI enabled; user has `instanceAi:message`.
- Primary path: Open Instance AI, ensure/select thread, send message or attachment, stream events, review messages/artifacts, rename or delete thread.
- Variants: Disabled module, other-user thread, unsupported attachment, active-run conflict, research mode.
- Success signal: Thread has messages, run events replay or stream, artifact/preview is visible.
- Source anchors: Inventory section 16; `packages/frontend/editor-ui/src/features/ai/instanceAi/`, `packages/cli/src/modules/instance-ai/instance-ai.controller.ts`, `packages/@n8n/instance-ai/src/`.

#### D09-CJ02 Instance AI approvals and gateway

- Actor: AI user, Admin.
- Goal: Approve high-risk Instance AI actions and connect local/browser tooling.
- Preconditions: Instance AI enabled; gateway allowed for user.
- Primary path: Create gateway link, pair daemon, view gateway status, approve confirmation/domain/resource decision, disconnect session.
- Variants: Admin disables Instance AI/local gateway, user disables gateway, static environment gateway key, per-user pairing/session key.
- Success signal: Gateway state changes, confirmation resolves, and tool access is gated.
- Source anchors: Inventory section 16; `packages/frontend/editor-ui/src/features/ai/instanceAi/`, `packages/cli/src/modules/instance-ai/instance-ai.controller.ts`.

#### D09-CJ03 AI workflow builder and Ask AI

- Actor: Builder, AI user.
- Goal: Generate or modify a workflow from chat and apply reviewed changes.
- Preconditions: Editable workflow; AI builder available.
- Primary path: Open Ask AI/canvas chat, prompt builder, answer setup questions, review diff, apply suggestions, complete credential/setup cards.
- Variants: Focused nodes, plan questions, streaming guard, credential setup, execute watcher.
- Success signal: Canvas reflects accepted changes and setup cards resolve.
- Source anchors: Inventory section 16; `packages/frontend/editor-ui/src/features/ai/assistant/`, `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/buttons/CanvasChatButton.vue`, `packages/@n8n/instance-ai/src/workflow-builder/`.

#### D09-CJ04 Agent creation and publish

- Actor: Builder, AI user.
- Goal: Create, configure, and publish an AI agent.
- Preconditions: Project exists; user has agent create/update/publish scopes.
- Primary path: Create agent, edit identity/config, add model/tools/skills/memory/triggers, validate runnable state, publish.
- Variants: Missing credentials, project permissions, schedule vs Slack/Telegram trigger, revert to published, unpublish.
- Success signal: Agent exists, is runnable, and published/unpublished state persists.
- Source anchors: Inventory section 14; `packages/frontend/editor-ui/src/features/agents/`, `packages/cli/src/modules/agents/agents.controller.ts`, `packages/@n8n/api-types/src/agents/`.

#### D09-CJ05 Agent chat and sessions

- Actor: AI user, Builder.
- Goal: Run an agent, inspect session history, and troubleshoot executions.
- Preconditions: Runnable agent; user has agent execute/read scope.
- Primary path: Send preview chat message, stream SSE, persist thread, open sessions list/detail timeline, inspect workflow execution log.
- Variants: Misconfigured agent, supplied session ID, project/agent thread ownership, deleted thread.
- Success signal: Chat completes or returns typed error; session timeline shows messages/events.
- Source anchors: Inventory section 14; `packages/frontend/editor-ui/src/features/agents/components/AgentChatPanel.vue`, `packages/frontend/editor-ui/src/features/agents/views/AgentSessionTimelineView.vue`, `packages/cli/src/modules/agents/agents.controller.ts`.

#### D09-CJ06 Chat Hub model conversation

- Actor: AI user.
- Goal: Chat with a selected provider/model and manage the conversation.
- Preconditions: User has `chatHub:message`; provider credentials are available or selectable.
- Primary path: Open Chat, select provider/model/credentials/tools, send message, stream response, edit/regenerate/stop, reconnect, manage title/delete.
- Variants: Chat-user restricted tools, dynamic credentials, attachments, stream replay after reconnect.
- Success signal: Conversation persists with messages/artifacts and correct stream status.
- Source anchors: Inventory section 15; `packages/frontend/editor-ui/src/features/ai/chatHub/`, `packages/cli/src/modules/chat-hub/chat-hub.controller.ts`.

#### D09-CJ07 Chat Hub custom and workflow agents

- Actor: AI user, Builder.
- Goal: Use personal or workflow agents from Chat Hub and canvas chat.
- Preconditions: Chat Hub enabled; agent or workflow agent exists.
- Primary path: Open personal/workflow agents, create/update custom agent, upload files, open canvas chat, send draft workflow message.
- Variants: Draft/manual workflow execution requires `workflow:execute` and `push-ref`, file upload, workflow vs personal agent.
- Success signal: Agent response streams and saved conversation points to the correct agent/workflow.
- Source anchors: Inventory section 15; `packages/frontend/editor-ui/src/features/ai/chatHub/`, `packages/cli/src/modules/chat-hub/chat-hub.controller.ts`.

#### D09-CJ08 Public chat

- Actor: External end user, AI user.
- Goal: Start a hosted or embedded chat and receive workflow-driven replies.
- Preconditions: Workflow has Chat Trigger; public chat enabled or manual/test mode active.
- Primary path: Open hosted chat/setup URL or embedded widget, send message, chat webhook executes workflow, response streams or returns from configured node.
- Variants: Hosted vs embedded webhook, public disabled by policy, basic/n8n-user/no auth, file uploads, previous-session loading, Chat Hub availability, streaming vs non-streaming.
- Success signal: Chat UI/API receives expected message stream or response; execution records chat input/session metadata.
- Source anchors: Inventory sections 24, 26, 27; `packages/frontend/@n8n/chat/src/`, `packages/@n8n/nodes-langchain/nodes/trigger/ChatTrigger/`, `packages/cli/src/chat/`, `packages/cli/src/webhooks/live-webhooks.ts`.

#### D09-CJ09 MCP settings and workflow availability

- Actor: Admin, API user.
- Goal: Enable MCP access and choose workflows exposed to MCP clients.
- Preconditions: User has MCP scopes; workflows exist.
- Primary path: Open MCP settings, enable access, get/rotate API key, search eligible workflows, toggle availability for workflows/project/folder.
- Variants: Environment-managed settings, missing scopes, archived workflows, bulk partial success/failure.
- Success signal: MCP enabled, key present/rotated, workflows marked `availableInMCP`.
- Source anchors: Inventory section 17; `packages/frontend/editor-ui/src/features/ai/mcpAccess/`, `packages/cli/src/modules/mcp/mcp.settings.controller.ts`.

#### D09-CJ10 MCP OAuth client and tool execution

- Actor: API user, External end user.
- Goal: Connect an MCP client and call n8n tools safely.
- Preconditions: MCP enabled; API key or OAuth client flow available.
- Primary path: Discover OAuth metadata, register/authorize, approve consent, exchange token, connect streamable HTTP endpoint, call search/build/execute/data-table tools.
- Variants: Access disabled, client cap reached, OAuth vs bearer key, workflow not available in MCP, rate limits.
- Success signal: Client initializes and tool response respects scopes and workflow availability.
- Source anchors: Inventory sections 17, 27; `packages/cli/src/modules/mcp/mcp.oauth.controller.ts`, `packages/cli/src/modules/mcp/mcp.auth.consent.controller.ts`, `packages/cli/src/modules/mcp/mcp.controller.ts`, `packages/cli/src/modules/mcp/tools/`.

#### D09-CJ11 AI/LangChain workflow graph

- Actor: Builder, AI user.
- Goal: Build an AI workflow with chat trigger, agent, model, memory, tools, and MCP/data nodes.
- Preconditions: Editable workflow; credentials for chosen provider/tools.
- Primary path: Add Chat Trigger, AI Agent, model, memory, and tool nodes; configure credentials/options; run chat/manual execution; inspect parsed AI run data.
- Variants: Hosted vs embedded chat, public/private auth, file uploads, provider differences, MCP client/tool/trigger nodes.
- Success signal: Workflow executes and AI output/tool steps appear in run data.
- Source anchors: Inventory section 26; `packages/@n8n/nodes-langchain/nodes/`, `packages/frontend/editor-ui/src/features/ndv/runData/components/ai/`.

### D10 Collaboration and permissions

#### D10-CJ01 Projects

- Actor: Admin, project admin.
- Goal: Create and govern a team project.
- Preconditions: Multi-user instance; actor can create/update projects.
- Primary path: Create project, set name/icon/description, add members, assign roles, verify project tabs, update or delete.
- Variants: Quota reached, owner/admin/project-admin actor, custom role vs system role, deletion with resources.
- Success signal: Project appears in navigation; member access matches role; deletion removes project access.
- Source anchors: Inventory sections 3, 19; `packages/cli/src/controllers/project.controller.ts`, `packages/frontend/editor-ui/src/features/collaboration/projects/`.

#### D10-CJ02 Sharing

- Actor: Builder, Collaborator.
- Goal: Share a workflow or credential and consume it from shared context.
- Preconditions: Saved resource; share target exists; actor has share scope.
- Primary path: Open share modal, search target project/user space, add sharee, save, target opens shared or project resource.
- Variants: Personal-space sharing disabled, team-project-owned resource, editor/viewer scopes, unshare.
- Success signal: Sharing persists; recipient sees resource with expected read/edit gates.
- Source anchors: Inventory sections 3, 4, 11, 19; `packages/frontend/editor-ui/src/app/components/WorkflowShareModal.ee.vue`, `packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialSharing.ee.vue`, `packages/frontend/editor-ui/src/features/credentials/credentials.ee.api.ts`, `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectSharing.vue`, `packages/frontend/editor-ui/src/app/api/workflows.ee.ts`, `packages/cli/src/credentials/`.

#### D10-CJ03 Folders

- Actor: Builder, project admin.
- Goal: Organize resources with folders and transfer folder contents.
- Preconditions: Project exists; actor has folder scopes.
- Primary path: Create nested folders, view breadcrumbs/content, move workflows/credentials into folders, rename/delete or transfer folder.
- Variants: Project vs personal folder, folder contains credentials, transfer to project, missing permission.
- Success signal: Folder tree/content reflects changes; transferred resources land in target project/folder.
- Source anchors: Inventory section 3; `packages/cli/src/controllers/folder.controller.ts`, `packages/frontend/editor-ui/src/features/core/folders/`, `packages/@n8n/api-types/src/dto/folders/`.

#### D10-CJ04 Live collaboration

- Actor: Builder, Collaborator.
- Goal: Co-edit safely with presence and write locks.
- Preconditions: Two users can open the same workflow.
- Primary path: User A opens workflow and gets write access; User B opens same workflow, sees presence/read-only lock, requests/acquires write access when allowed.
- Variants: Same user different tab, different user lock, expired lock, remote update while dirty.
- Success signal: Presence stack updates; only writer can edit/save; lock release/acquire changes canvas state.
- Source anchors: Inventory sections 3, 5; `packages/cli/src/collaboration/`, `packages/frontend/editor-ui/src/features/collaboration/collaboration/`, `packages/frontend/editor-ui/src/app/views/NodeView.vue`.

### D11 Admin, identity, security, and enterprise

#### D11-CJ01 Invitations

- Actor: Admin, invitee.
- Goal: Invite users and complete account activation.
- Preconditions: Owner setup complete; SSO invite restrictions considered.
- Primary path: Admin invites users with roles, reinvites/copies invite link, invitee accepts token and sets profile/password.
- Variants: User limit reached, admin invite license gate, pending vs accepted user, SSO enabled blocks manual invites.
- Success signal: Pending user becomes active; role is assigned; invite link cannot be reused incorrectly.
- Source anchors: Inventory sections 19, 20; `packages/cli/src/controllers/invitation.controller.ts`, `packages/cli/src/controllers/users.controller.ts`, `packages/frontend/editor-ui/src/features/settings/users/`.

#### D11-CJ02 User admin and offboarding

- Actor: Owner, Admin.
- Goal: Maintain users, roles, and owned data during offboarding.
- Preconditions: Multiple users/projects exist.
- Primary path: List users, update global role, delete a user with transfer or delete-data strategy.
- Variants: Owner cannot be deleted, provisioned roles locked, transfer workflows/credentials/folders vs delete data.
- Success signal: User is removed or role updated; transferred resources belong to target project.
- Source anchors: Inventory section 19; `packages/cli/src/controllers/users.controller.ts`, `packages/frontend/editor-ui/src/features/settings/users/`.

#### D11-CJ03 Custom roles

- Actor: Admin.
- Goal: Define custom project permissions and understand assignment impact.
- Preconditions: Advanced permissions licensed.
- Primary path: Open project roles, duplicate/create role, adjust scopes, view assignments, delete or edit role.
- Variants: System role read-only, role in use, external-secrets scopes enabled/disabled, unlicensed upgrade path.
- Success signal: Role scopes persist; assignments reflect usage; affected users gain/lose expected project permissions.
- Source anchors: Inventory sections 19, 20; `packages/cli/src/controllers/role.controller.ts`, `packages/frontend/editor-ui/src/features/project-roles/`.

#### D11-CJ04 SSO

- Actor: Admin, SSO user.
- Goal: Configure SAML/OIDC login and provisioning safely.
- Preconditions: Enterprise auth licensed; identity-provider details available.
- Primary path: Select SAML or OIDC, enter metadata/discovery/client values, test config, enable login, configure provisioning/role mapping, log in through provider.
- Variants: Environment-managed lock, disable SSO confirmation, failed test, identity-provider role assignment changes.
- Success signal: Test succeeds; login creates/links user; mapped roles/projects apply.
- Source anchors: Inventory section 20; `packages/cli/src/modules/sso-saml/`, `packages/cli/src/modules/sso-oidc/`, `packages/cli/src/modules/provisioning.ee/`, `packages/frontend/editor-ui/src/features/settings/sso/`.

#### D11-CJ05 LDAP

- Actor: Admin, provisioned user.
- Goal: Configure LDAP login and synchronization.
- Preconditions: LDAP licensed; directory reachable.
- Primary path: Enter LDAP connection/bind/user mapping settings, test connection, run dry/live sync, review sync table, log in.
- Variants: Login disabled vs sync enabled, admin vs user bind, TLS modes, reset command.
- Success signal: Sync reports expected users/status; LDAP login works or fails with clear state.
- Source anchors: Inventory section 20; `packages/cli/src/modules/ldap.ee/`, `packages/cli/src/commands/ldap/reset.ts`, `packages/frontend/editor-ui/src/features/settings/sso/`.

#### D11-CJ06 API keys

- Actor: Admin, API user.
- Goal: Create scoped API keys and verify scoped API access.
- Preconditions: Public API enabled; actor has API-key scope.
- Primary path: Open API settings, fetch available scopes, create key, copy raw key once, edit label/scopes, delete key.
- Variants: Role-limited scopes, invalid scope rejection, disabled user, deleted key auth.
- Success signal: Redacted key listed; raw key returned once; API-key auth grants only selected scopes.
- Source anchors: Inventory sections 19, 27; `packages/cli/src/controllers/api-keys.controller.ts`, `packages/cli/src/services/api-key-auth.strategy.ts`, `packages/frontend/editor-ui/src/features/settings/apiKeys/`.

#### D11-CJ07 Security settings

- Actor: Admin.
- Goal: Harden personal-space sharing/publishing and execution-data visibility.
- Preconditions: Security settings available or licensed as needed.
- Primary path: Open security settings, inspect affected counts, toggle personal-space sharing/publishing, enable redaction and choose scope.
- Variants: Unlicensed upgrade, environment-managed policy, existing shared/published resources, redaction scope.
- Success signal: Settings persist, affected counts match seeded resources, restricted personal-space actions are blocked or hidden, and selected execution data is redacted.
- Source anchors: Inventory section 19; `packages/cli/src/controllers/security-settings.controller.ts`, `packages/cli/src/services/security-settings.service.ts`, `packages/frontend/editor-ui/src/features/settings/security/SecuritySettings.vue`.

#### D11-CJ08 Licensing

- Actor: Admin.
- Goal: Activate or renew capabilities and handle license-gated flows.
- Preconditions: Admin has license key or trial/community registration path.
- Primary path: Request trial/register, activate key, accept EULA if required, renew, observe gated settings/banners.
- Variants: Community vs enterprise, EULA required, expired/non-production/trial-over, CLI info/clear.
- Success signal: License data updates; gated UI becomes available or shows correct upgrade state.
- Source anchors: Inventory sections 20, 28; `packages/cli/src/license/`, `packages/cli/src/commands/license/`, `packages/frontend/editor-ui/src/features/settings/usage/`.

### D12 Operations, source control, workers, and public API

#### D12-CJ01 Source control

- Actor: Operator, Admin.
- Goal: Promote changes through source control with safe read-only modes.
- Preconditions: Source control licensed; repository credentials/branch available.
- Primary path: Configure SSH/HTTPS, generate key if needed, select branch/color/read-only, inspect status, push selected files with commit, pull with preview.
- Variants: Read-only branch, force push/pull, auto-publish on pull, conflicts, scoped project resources.
- Success signal: Preferences persist; status clears after push/pull; read-only environment blocks edits.
- Source anchors: Inventory section 21; `packages/cli/src/modules/source-control.ee/`, `packages/frontend/editor-ui/src/features/integrations/sourceControl.ee/`, `packages/frontend/editor-ui/src/app/components/MainSidebarSourceControl.vue`.

#### D12-CJ02 External secrets

- Actor: Admin, project admin, Builder.
- Goal: Connect external secrets and expose them only to intended projects/credentials.
- Preconditions: External secrets licensed; provider credentials available.
- Primary path: Create provider connection, test, enable/sync/reload, scope to global or projects, use completion in credential field.
- Variants: Legacy vs new providers, project-scoped access, read-only/no-permission modal, system-role toggle.
- Success signal: Provider shows connected; secrets count/completions update; unauthorized projects cannot access secrets.
- Source anchors: Inventory sections 12, 19; `packages/cli/src/modules/external-secrets.ee/`, `packages/frontend/editor-ui/src/features/integrations/secretsProviders.ee/`, `packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectExternalSecrets.vue`.

#### D12-CJ03 Ops observability

- Actor: Operator.
- Goal: Monitor workers and stream operational/audit events externally.
- Preconditions: Queue mode/workers or log streaming licensed; destination details available.
- Primary path: Open worker view, poll worker status, open log streaming, create destination, choose event groups/anonymization, send test message, enable/delete.
- Variants: Webhook/Sentry/syslog destination, environment-managed destinations, no workers/unlicensed, queue vs main mode.
- Success signal: Worker cards show jobs/host/memory/version via push; destination test succeeds and selected events persist.
- Source anchors: Inventory section 22; `packages/cli/src/scaling/`, `packages/cli/src/modules/log-streaming.ee/`, `packages/frontend/editor-ui/src/features/settings/orchestration.ee/`, `packages/frontend/editor-ui/src/features/integrations/logStreaming.ee/`.

#### D12-CJ04 Insights dashboard and summaries

- Actor: Builder, Admin, API user.
- Goal: Review workflow/resource usage insights and summaries.
- Preconditions: Insights enabled; user has `insights:list`.
- Primary path: Open Insights dashboard by type, change date/project filter, view workflow table/charts, see inline summaries on data-table/resource pages.
- Variants: Dashboard license gate, default last-seven-days date, invalid date range, public API summary only.
- Success signal: Summary/charts return expected period and license-appropriate data.
- Source anchors: Inventory sections 18, 27; `packages/frontend/editor-ui/src/features/execution/insights/`, `packages/cli/src/modules/insights/insights.controller.ts`, `packages/cli/src/public-api/v1/handlers/insights/insights.handler.ts`.

#### D12-CJ05 Public API automation

- Actor: API user, Admin.
- Goal: Create scoped API access and automate resources externally.
- Preconditions: Public API enabled; user can manage API keys.
- Primary path: Create API key with valid scopes, call docs/openapi/discover, manage workflows/executions/credentials/projects/tags/variables/data tables/insights, paginate results.
- Variants: API disabled, invalid scopes for role, missing API-key scope, license-gated endpoints, project resource scopes.
- Success signal: API returns durable resource state or correct forbidden/not-found/validation response.
- Source anchors: Inventory sections 19, 27; `packages/cli/src/controllers/api-keys.controller.ts`, `packages/cli/src/public-api/index.ts`, `packages/cli/src/public-api/v1/handlers/`.

#### D12-CJ06 Community nodes

- Actor: Operator, Builder.
- Goal: Install, update, use, and remove community node packages safely.
- Preconditions: Community nodes are enabled; package source is reachable; actor has package management scope.
- Primary path: Search or enter package, install package, verify node types appear in creator, use a node in workflow, update or remove package.
- Variants: Package install disabled, package policy denial, unavailable node in workflow, hot reload/push behavior, filesystem custom nodes.
- Success signal: Installed node types are discoverable; workflows using unavailable nodes show actionable state; removal/update changes package registry.
- Source anchors: Inventory section 23; `packages/cli/src/modules/community-packages/`, `packages/frontend/editor-ui/src/features/settings/communityNodes/`, `packages/nodes-base/package.json`.

#### D12-CJ07 CLI and self-hosted operations

- Actor: Operator.
- Goal: Maintain a self-hosted instance through command-line workflows.
- Preconditions: Operator has shell access and configured instance environment.
- Primary path: Start server/webhook/worker processes, execute workflows, import/export data, publish/unpublish, audit, reset MFA/LDAP/user state, inspect config/license state.
- Variants: Main vs worker/webhook process, queue mode, missing config, encrypted credential imports, destructive admin operations, license state.
- Success signal: Command exits with expected state change or diagnostic output and does not corrupt persisted data.
- Source anchors: Inventory section 28; `packages/cli/src/commands/`, `packages/cli/src/commands/worker.ts`, `packages/cli/src/commands/webhook.ts`.

## Open Questions

- Should cloud-only, self-host-only, and queue-mode behaviors be represented as variants inside each journey or as separate operator journeys?
- Which enterprise capabilities should be promoted to first-class journeys versus grouped as admin/security variants?
- Which built-in node families should become representative journey candidates for node catalog trust: HTTP/API, webhook/form/chat, database, files/binary, code execution, messaging, or SaaS CRUD?
- Which AI/LangChain capabilities need browser-level journeys, and which are better represented by API/runtime/integration tests because of provider nondeterminism?
- Should workflow history and publishing timeline remain in workflow authoring, execution/debugging, or collaboration/permissions for prioritization?
- Should public API journeys be grouped by resource type or by external automation outcome?
- How should existing source-control read-only states be modeled against normal collaboration read-only states?
- Which external end-user surfaces are most important: hosted chat, forms, public webhooks, OAuth consent, MCP OAuth, or binary download?
- Which cross-cutting states from inventory section 29 need explicit variants in Task 2: unlicensed, unauthorized, read-only, archived, dirty, waiting, failed, stopped, redacted, or cloud/self-host split?
- Should community-node installation and custom-node loading be treated as operator journeys, builder extensibility journeys, or both?
