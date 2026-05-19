# Product Feature Inventory

Status: Source-backed inventory. Existing E2E tests have not been inspected.
Date: 2026-05-19

This inventory is intended to be the source material for a future end-to-end journey map. It deliberately ignores the existing E2E, Playwright, Cypress, and test fixtures, and instead derives product features from application routes, feature modules, controllers, API contracts, runtime packages, node packages, and user-facing source.

The list is feature-area complete at the product level. The integration catalog is represented as product capabilities and node families rather than one journey per integration, because the repository registers hundreds of node implementations and the journey model should group them by behavior.

## Source Anchors

- Frontend route surface: `packages/frontend/editor-ui/src/app/router.ts`
- Frontend feature modules: `packages/frontend/editor-ui/src/app/moduleInitializer/`, `packages/frontend/editor-ui/src/features/**/module.descriptor.ts`
- Frontend navigation and settings: `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`, `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`
- Workflow editor and canvas: `packages/frontend/editor-ui/src/app/views/NodeView.vue`, `packages/frontend/editor-ui/src/features/workflows/canvas/`, `packages/frontend/editor-ui/src/features/ndv/`
- Backend controllers and modules: `packages/cli/src/controllers/`, `packages/cli/src/modules/`, `packages/cli/src/workflows/`, `packages/cli/src/executions/`, `packages/cli/src/credentials/`
- Shared API contracts: `packages/@n8n/api-types/src/`
- Runtime and workflow engine: `packages/core/src/`, `packages/workflow/src/`
- Built-in nodes: `packages/nodes-base/nodes/`
- AI/LangChain nodes: `packages/@n8n/nodes-langchain/nodes/`
- Node registries: `packages/nodes-base/package.json`, `packages/@n8n/nodes-langchain/package.json`
- CLI and operational commands: `packages/cli/src/commands/`
- Public API: `packages/cli/src/public-api/v1/`

## 1. Account, Auth, And First Run

- Owner setup and first-run instance initialization.
- Sign in, sign up, sign out, guest routing, and authenticated routing.
- Forgot password, reset password, and change password.
- Current-user profile and personal settings.
- Theme selection and user preferences.
- MFA setup, prompt, verification, recovery code flow, disable flow, and enforced-MFA redirect.
- OAuth consent screen for MCP/OAuth client authorization.
- SAML onboarding entry point.
- Entity-not-found, entity-unauthorized, generic error, and catch-all not-found screens.

## 2. App Shell, Navigation, And Discovery

- Main sidebar with Home, Personal project, Shared, Projects, Favorites, Instance AI, Chat, Insights, Templates or Resource Center, Help, and Settings.
- Sidebar collapse, resize, persisted width, overflow behavior, and sidebar experiment handling.
- Project navigation with personal, shared, project, and favorite sections.
- Source control status indicator in the sidebar.
- Help menu links for quickstart, docs, forum, courses, report bug, about modal, and version information.
- Global entity creation actions from project headers and resource pages.
- Recent resource tracking and command-bar/resource registry integration.
- Bottom menu/user area and cloud admin entry point.
- Resource Center experiment and template-discovery replacement.

## 3. Home, Projects, Shared Spaces, And Resource Organization

- Home overview for workflows, credentials, executions, folders, variables, data tables, agents, and related tabs.
- Personal project view and team project view.
- Shared-with-me view for workflows and credentials.
- Team project creation, listing, navigation, and deletion.
- Project settings for name, icon, description, members, roles, and deletion.
- Project member add/remove/change-role flows.
- Team project quota and project count behavior.
- Project-level permissions and route gating.
- Resource sharing between projects.
- Share-target discovery.
- Resource transfer/move flows between projects.
- Favorites for workflows, folders, projects, and sidebar entries.
- Folder CRUD, nested folders, breadcrumbs, drag-and-drop/move-to-folder, transfer, and delete.
- Folder-aware workflow and credential listing.
- Tags for workflows and tag-filtered workflow listing.
- Live collaborator presence and workflow write locks.

## 4. Workflow Library

- Workflow list across home, project, folder, and shared contexts.
- Workflow search, pagination, sorting, and filtering.
- Active/deactivated status filter.
- Archived workflow visibility and archive/unarchive behavior.
- Workflow cards with status, ownership/project metadata, dependency badges, and actions.
- Create workflow from empty state, project header, folder action, and global creation entry points.
- Duplicate workflow.
- Import workflow from file, clipboard, URL, template, or demo.
- Export workflow and workflow JSON handling.
- Rename workflow and edit description.
- Workflow share modal and workflow transfer.
- Workflow production checklist.
- Workflow activation, deactivation, activation conflict handling, and activation error handling.
- Workflow dependency counts and dependent resources.
- Workflow favorites and unfavorite actions.
- Read-only environment behavior for workflow list actions.

## 5. Workflow Editor And Canvas

- New workflow route, existing workflow route, and generated unsaved workflow IDs.
- Visual canvas with nodes, connections, sticky notes, selection, range selection, pan, zoom, fit view, and viewport persistence.
- Add nodes from canvas, connection handle, empty canvas, keyboard shortcut, and node replacement.
- Move nodes, move multiple nodes, tidy up layout, duplicate nodes, copy/cut/paste nodes, and delete nodes.
- Create and delete connections, including connection cancellation and non-main connection handling.
- Enable/disable single and multiple nodes.
- Rename nodes inline or through modal.
- Replace node parameters and update node inputs/outputs after parameter changes.
- Sticky note creation, editing, movement, deletion, and color selection.
- Open sub-workflow from Execute Workflow-style nodes.
- Import workflow data into the current canvas.
- Fetch workflow from URL.
- Save, autosave, first-save handling, dirty-state handling, before-unload protection, and save-from-debug.
- Read-only canvas behavior outside editable workflow routes.
- Collaboration presence, active-editor state, and acquire-editing flow.
- Focus panel and focus sidebar.
- Workflow-level settings modal.
- Workflow extraction into a new workflow.
- Browser activity detection used by collaboration.

## 6. Node Creator And Node Selection

- Node creator panel with search, keyboard navigation, categories, subcategories, labels, and no-results state.
- Trigger-node selection and action-node selection.
- App/action selection mode.
- Community node entries.
- Template-opening entries from the node creator.
- AI node categories and AI-specific node recommendations.
- Human-in-the-loop category.
- Node order switching and view-stack navigation.
- Node creator coachmark and shortcut discovery.
- Dynamic action generation surfaces.
- Node type loading, filtering, and disabled/unavailable-node handling.

## 7. Node Details View And Node Configuration

- Node details view and experimental node details view.
- Node settings tabs and invalid-node warning.
- Parameter rendering for simple, collection, fixed collection, resource locator, assignment, filter conditions, and custom parameter types.
- Expression editor, expression modal, expression autocomplete, expression preview, and resolved-expression display.
- Import cURL command into HTTP request-style parameters.
- Credential selector and credential create/edit from node configuration.
- Dynamic node parameters: options, resource locator results, resource mapper fields, and action results.
- Input panel, output panel, trigger panel, draggable panels, floating nodes, and sub-connection displays.
- Run data views for JSON, table, binary, HTML, markdown, parsed AI content, and schema preview.
- Run data pagination, search, item counts, copy actions, and highlighting.
- Pin data, unpin data, and pinned-data source handling.
- Binary data preview/download/embed behavior.
- Redacted-data state and reveal-data warnings.
- Node webhooks display, including test and production URLs.
- Copy test webhook URL and production webhook URL.
- Execute node and run workflow to selected node.

## 8. Workflow Execution And Debugging

- Manual workflow execution from canvas.
- Run entire workflow and run from trigger selection.
- Stop active execution.
- Stop waiting-for-webhook execution.
- Execution state push updates.
- Global executions list.
- Project executions list.
- Workflow-specific executions view.
- Execution preview panel with selected node output.
- Execution filters, auto-refresh, concurrent execution count, and estimated total count.
- Execution retry and stop actions.
- Stop many executions.
- Delete execution.
- Execution annotations and annotation tags.
- Execution errors, wait-till state, unfinished-workflow warning, and sub-execution links.
- Debug in editor from a previous execution.
- Reveal/debug data controls under enterprise gating.
- Execution recovery and failed execution handling.

## 9. Workflow History, Versions, And Publishing Timeline

- Workflow history route and version list.
- Workflow history version selection.
- Workflow diff view and synced diff canvas.
- Restore workflow history version.
- Workflow version naming/form modal.
- Publish timeline tab and published-version status.
- Unpublish modal.
- Workflow history upgrade footer and history availability gating.
- Backend workflow history lookup, update, compaction, and pruning.

## 10. Templates, Onboarding, And Ready-To-Run Workflows

- In-app template search.
- External template repository redirect.
- Template collections.
- Template detail page.
- Setup workflow from template.
- Template import onto canvas.
- Setup template credentials modal and credential setup state.
- Apps-requiring-credentials notices.
- Workflow onboarding route.
- Demo workflow and demo diff view.
- Personalized templates.
- Recommended templates.
- AI starter template collections.
- Ready-to-run workflow empty-state entry points.
- Template recommendation experiments and resource-center crossover.

## 11. Credentials, OAuth, And Connection Setup

- Credential list across home, project, and shared contexts.
- Credential create, edit, duplicate-like recreate flows, delete, and test connection.
- Credential type selection modal.
- Credential type search and filter.
- Credential setup-needed filter.
- Credential dependency counts and workflow usage.
- Credential sharing, transfer, and project/global access.
- Global credentials and enterprise credential sharing behavior.
- Credential overwrite support and read-only values.
- OAuth1 and OAuth2 authorization callback flows.
- OAuth refresh/reconnect handling.
- Dynamic credentials and credential resolvers.
- Quick-connect credential creation.
- Credential resolver CRUD, resolver types, resolver config expressions, authorization/revoke flow, and affected workflow status.

## 12. External Secrets, Variables, And Encryption Keys

- Environment/project variables list, create, edit, delete, and usage count.
- Variable filters for project, scope, and incomplete values.
- Variable autocomplete/completions in expressions.
- External secrets legacy provider setup.
- Secrets Providers connection list, create/edit/delete, enable/disable, test, reload, and project access.
- External secrets provider completions in credential fields.
- External secrets redaction and access checks.
- Encryption key list and rotation flow.
- Encryption bootstrap and key manager behavior.

## 13. Data Tables

- Data Tables overview tab for home and project contexts.
- Data Table create modal.
- Data Table list, search, sort, pagination, and cards.
- Data Table details grid.
- Typed columns and schema handling.
- Add, rename, move, update, and delete columns.
- Add, update, upsert, and delete rows.
- Row selection and bulk row operations.
- Column filters and typed filter mappings.
- CSV import and upload handling.
- CSV download/export.
- Storage limit callout and size validation.
- Data Table node integration and branch write-access middleware.
- Global aggregate/list API behavior.

## 14. Agents

- Agents list in home and project contexts.
- New agent flow.
- Agent builder route.
- Agent preview route.
- Agent sessions list and session detail timeline.
- Agent settings page.
- Agent identity, capabilities, memory, advanced settings, and JSON editor.
- Agent tools list, tool config modal, custom tool viewer, and workflow tool configuration.
- Agent skills list, skill modal, and skill viewer.
- Agent trigger modal and connected triggers.
- Schedule trigger card and integration settings.
- Slack and Telegram integration settings.
- Agent chat panel, quick actions, message list, and tool-step display.
- Interactive agent cards for credentials, LLM choice, and question prompts.
- Agent publish button and publish/unpublish behavior.
- Agent sessions timeline, charts, filters, event rows, and workflow execution log viewer.
- Backend agent CRUD, JSON config, tools, skills, threads, integrations, publish, and execution services.

## 15. Chat Hub

- Chat route and conversation route.
- Personal agents view and workflow agents view.
- Chat sidebar, conversation list, conversation header, and session menu.
- Chat prompt compact/full modes and starter prompts.
- Suggested prompts editor.
- Chat message rendering with markdown, typing indicator, copy/action buttons, and artifacts.
- File drop and attachments.
- Provider/model selection.
- Credential selector for chat providers.
- Model-by-ID selector.
- Provider settings modal.
- Tool selector, tools manager modal, and tool settings modal.
- Custom agent editor modal.
- Dynamic credentials drawer/status inside chat.
- Canvas chat floating menu, floating window, overlay, and canvas chat panel.
- Chat settings page.
- Backend conversation, models, credentials, tools, workflow agents, execution watcher, stream, title, and attachment services.

## 16. Instance AI And AI Assistant

- Instance AI empty route and thread route.
- Instance AI thread list, input, messages, status bar, markdown, artifacts, and feedback.
- Instance AI timeline, tool calls, subagent steps, task checklist, and plan review.
- Confirmation panel, confirmation preview, and confirmation footer.
- Credential setup flow and modal.
- Workflow preview, data table preview, artifact panel, preview tabs, and debug panel.
- Attachment preview.
- Domain access approval and gateway resource decisions.
- Browser-use and computer-use setup modals.
- Instance AI settings page and memory API.
- Legacy AI assistant settings.
- Ask AI / AI workflow builder chat panel.
- AI builder workflow generation, apply suggestion, review changes, code diff, focused nodes, todos, setup cards, and streaming guard.
- AI Gateway/n8n Connect settings, wallet balance, free credits callout, top-up modal, usage, and token details.
- Backend Instance AI thread/message/snapshot/resource/memory services, SSE, liveness, compaction, and pruning.

## 17. MCP Access And MCP Server

- MCP settings page.
- API key create/rotate for MCP access.
- Workflow availability toggles for MCP.
- Connect workflows modal.
- Surface-MCP onboarding modals for cloud users.
- MCP OAuth consent and OAuth client management.
- MCP OAuth discovery, authorization, token, and consent endpoints.
- MCP streamable HTTP server endpoint.
- MCP tools for searching projects, workflows, folders, credentials, executions, data tables, workflow details, workflow execution, pin data preparation, publish/unpublish, and workflow building.
- MCP registry and MCP client/tool/trigger nodes.

## 18. Insights, Usage, Telemetry, And Feedback

- Insights route and dashboard by insight type.
- Inline insights summary on workflows, credentials, data tables, and executions resource pages.
- Weekly summary refresh on home/data tables entry.
- Workflow statistics endpoints and runtime collection.
- Time-saved and insights collection/aggregation/pruning/compaction.
- Usage and plan settings page.
- Community Plus enrollment and EULA acceptance modals.
- NPS survey.
- Frontend telemetry and posthog feature flag store.
- Backend telemetry, PostHog proxy, survey answers, CTAs, banners, and third-party licenses.

## 19. Users, Roles, Permissions, And Security Settings

- Users list, invite users, pending users, reinvite, copy invite link, delete user, and role update.
- Delete-user flows with data transfer or data deletion.
- Manual SSO login control for users.
- Owner setup and owner-specific routes.
- Owner, admin, member, chat-user, project admin, project editor, project viewer, and project chat roles.
- Role service and role cache.
- RBAC route middleware and scope checks.
- Project roles list, create, edit, view, assignments, and project members modal.
- Custom project role duplication, scope editor, assignment impact, and license gating.
- Role mapping rules for provisioned users.
- API key list, create, edit, delete, and scope selection.
- Security settings page.
- Enforce MFA setting.
- Personal-space sharing and publishing settings.
- Affected-resource counts and confirmation dialogs for security policy changes.
- Data redaction/security settings.
- Execution data redaction, reveal auditing, and redaction enforcement surfaces.
- Password policy and password utilities.
- Public API key service and API-key auth strategy.

## 20. Enterprise Auth And Provisioning

- SAML settings, metadata, ACS, login, config test, toggle, and onboarding.
- OIDC settings, test result, callback, and login.
- LDAP settings, sync, test, reset command, and login behavior.
- SSO login component and SSO store.
- Provisioning settings and role resolver.
- Provisioning mode/configuration.
- IdP-driven instance/project role assignment.
- Expression-based role mapping rule create/edit/delete/reorder.
- Environment-managed locks for SSO/provisioning settings.
- License key activation.
- License management-token renewal.
- Enterprise trial request.
- Community Plus registration.
- License info and clear commands.
- EULA-required handling and EULA acceptance modal.
- Frontend enterprise feature flags and limits.
- Enterprise feature gating and upgrade prompts.

## 21. Source Control, Environments, And Release Operations

- Source control settings page.
- Connect source control via SSH/HTTPS.
- SSH key generation.
- Branch selection and branch color.
- Read-only branch mode and read-only environment behavior.
- Source control status, initialization errors, and branch status.
- Pull modal and pull result modal.
- Push modal, selected file list/tree, commit message, force push, and remote preview.
- Source control export/import, status, preferences, keypair, and scoped services.
- CLI workflow publish/unpublish/update/list commands.
- Migration report route, rule list, rule detail, severity tags, and breaking-change detection rules.
- Instance version history.

## 22. Log Streaming, Workers, And Operations

- Log streaming destination list.
- Destination create/edit/test/delete for webhook, Sentry, syslog, and supported destinations.
- Event selection and event destination settings modal.
- Audit event payloads and event group selection.
- Managed-by-environment behavior.
- CLI and Public API security audit report.
- Audit risk categories.
- Worker view settings page.
- Worker list, worker cards, job accordion, charts, memory monitor, and network accordion.
- Worker status dashboard with running job, process, host, network, and version details.
- Queue mode and worker process command.
- Orchestration controller and scaling services.
- Instance registry, stale member cleanup, split-brain/host-id/version/lifecycle checks.
- Concurrency control, capacity reservation, and queue behavior.
- Active workflows controller/service.
- Active executions service.
- Pruning of executions and workflow history.
- Metrics and Prometheus/license metrics.
- OpenTelemetry module.
- Shutdown and crash journal behavior.

## 23. Community Nodes And Extensibility

- Community nodes settings page.
- Install community package modal.
- Manage/update/uninstall community package flow.
- Community package card and installed package list.
- Nodes-in-workflow table for installed packages.
- Contact administrator state.
- Community package lifecycle service and npm utilities.
- Community node type discovery.
- Custom node loading from packages and directories.
- Node description validation.
- Hot reload/push support for node changes.
- Node-dev package and custom directory loaders.

## 24. Runtime Engine And Workflow Semantics

- Workflow graph model, node connections, connection traversal, parent/child node utilities, and workflow validation.
- Source and destination connection indexes.
- Workflow settings, timezone, static data, and pin data.
- Workflow activation/deactivation and trigger registration.
- Trigger, poller, webhook, execute, execute-single, supply-data, load-options, credentials-test, and hook contexts.
- Manual, scheduled, trigger, webhook, retry, error, evaluation, chat, agent, partial, and sub-workflow execution modes.
- Execution run data, node stack, waiting state/source, resume token, wait date, parent execution, manual dirty nodes, and redaction data.
- Partial execution graph logic, start-node discovery, disabled-node filtering, cycle handling, source data groups, and run-data cleanup.
- Destination-node partial runs and dirty-subgraph reruns.
- Pin-data substitution during manual execution.
- Tool-node rewiring through virtual tool execution.
- Routing node execution and request/response helpers.
- Data proxy for expressions and workflow data access.
- Expression sandboxing, expression AST sanitizers, denylisted globals, expression extensions, native methods, and parameter validation.
- Expression variables including `$input`, `$json`, `$binary`, `$node`, `$workflow`, `$env`, `$now`, `$today`, `$fromAI`, `$tool`, paired item access, and JMESPath helpers.
- Execution lifecycle hooks and context-establishment hooks.
- Binary data storage through filesystem, database, and object storage managers.
- Deduplication helpers.
- External secrets proxy in execution context.
- Error classes for node, workflow, webhook, credential, binary data, and execution failures.
- Execution metadata and run execution data formats.
- Webhook response modes including immediate response, last node, response node, form page, hosted chat, and streaming.

## 25. Built-In Node Catalog Capabilities

- The built-in node package registry currently registers 439 nodes and 397 credential types.
- Triggers: manual, schedule/cron, webhook, chat, form, local file, SSE, n8n trigger, error trigger, workflow trigger, and service-specific triggers.
- Webhook behavior: test/production URLs, HTTP methods, auth, CORS, IP whitelist, binary/raw body handling, and streaming notices.
- Respond-to-webhook behavior: JSON, text, JWT, redirect, binary file, no data, first/all incoming items, custom headers/status, and optional streaming.
- Core flow control: If, Switch, Merge, Filter, Split in Batches, Wait, Stop and Error, NoOp, Simulate, Flow, and Compare Datasets.
- Data transformation: Set, Transform, Item Lists, Rename Keys, HTML, HTML Extract, Markdown, XML, JWT, Crypto, Date and Time, Compression, spreadsheet/file conversion, binary read/write/move, PDF reading, image editing, and code execution.
- Sub-workflow execution from database workflow, JSON, file, or URL, once or per item.
- Code execution through JavaScript and Python task-runner sandboxes.
- HTTP and API work: HTTP Request, GraphQL, Respond to Webhook, PostBin, API Template IO, and generic credential patterns.
- Files and storage: FTP, S3, local files, Dropbox, Box, Nextcloud, Google storage-related nodes, spreadsheet files, and binary data utilities.
- Databases and queues: Postgres, MySQL, MongoDB, Redis, RabbitMQ, Kafka, MQTT, AMQP, Snowflake, Databricks, Oracle, CrateDB, QuestDB, TimescaleDB, Supabase, and Data Table.
- Developer and infrastructure tools: Execute Command, Git, GitHub, GitLab, Bitbucket, Jenkins, CircleCI, TravisCI, Docker-adjacent operational nodes where present, SSH, Grafana, Sentry, PostHog, and n8n API nodes.
- Communication: Email Send, Email Read IMAP, Slack, Discord, Telegram, Microsoft, WhatsApp, Twilio, SendGrid, Mailgun, Mailchimp, Mattermost, Matrix, Rocket.Chat, Zulip, SMS providers, Pushbullet, Pushover, and related messaging services.
- Business apps and SaaS integrations: CRM, marketing, support, ecommerce, productivity, forms, analytics, scheduling, finance, issue tracking, content, document, and project-management services represented by the integration directories under `packages/nodes-base/nodes/`.
- Training/demo/test support nodes: n8n training customer datastore/messenger and debug helper nodes.

## 26. AI/LangChain Node Catalog Capabilities

- The AI/LangChain package registry currently registers 119 nodes and 38 credential types.
- AI agents and OpenAI Assistant-style nodes.
- AI Agent nodes with connected language model, memory, tools, output parser, fallback model, and streaming support.
- Chat Trigger with hosted/embedded chat, public/private modes, auth, file uploads, previous-session loading, Chat Hub metadata, last-node/respond-node responses, and streaming responses.
- Chat and completion model nodes across Anthropic, OpenAI, Azure OpenAI, AWS Bedrock, Google Gemini, Google Vertex, Cohere, Mistral, Ollama, Groq, DeepSeek, OpenRouter, xAI/Grok, Nvidia, Minimax, Moonshot, Alibaba Cloud, Vercel AI Gateway, Hugging Face, and related providers.
- Embedding model nodes across OpenAI, Azure OpenAI, Cohere, Google Gemini, Google Vertex, AWS Bedrock, Mistral, Ollama, Hugging Face, Lemonade, and related providers.
- Chains for LLM, retrieval QA, summarization, information extraction, sentiment analysis, and text classification.
- Document loaders for binary input, default data, GitHub, and JSON input.
- Text splitters for character, recursive character, and token splitting.
- Vector stores including in-memory, PGVector, Pinecone, Qdrant, Supabase, Redis, MongoDB Atlas, Milvus, ChromaDB, Azure AI Search, Weaviate, Zep, and related insert/load variants.
- Retrievers, contextual compression, multi-query retrieval, workflow retriever, and vector store retriever.
- Memory nodes for buffer window, chat retriever, manager, Postgres, Redis, MongoDB, Xata, Zep, and related memory stores.
- Output parsers for structured output, item lists, and autofixing.
- Tools for calculator, code, HTTP request, workflow, vector store, Wikipedia, Wolfram Alpha, SearXNG, SerpAPI, and think/tool-executor patterns.
- Guardrails, rerankers, model selector, MCP client/tool/registry/trigger nodes, and chat/manual chat triggers.
- Guardrails for jailbreak, NSFW, PII, secrets, and topic classification/sanitization.
- Model Selector routing by workflow-data rules.

## 27. Public API And Automation Interfaces

- Public API discover endpoint.
- Public API workflows CRUD, activation, transfer, tags, and import/export-like operations.
- Public API executions list/get/delete/retry-like operations where supported.
- Public API credentials CRUD and credential type behavior.
- Public API projects and project folders.
- Public API tags.
- Public API variables.
- Public API audit.
- Public API source-control pull.
- Public API users.
- Public API community packages.
- Public API data tables, columns, and rows.
- Public API insights summary.
- Internal REST APIs for all editor surfaces.
- Webhook endpoints for production and test webhooks.
- Chat endpoints for embedded/public chat interactions.
- OAuth endpoints for credentials and MCP clients.
- Binary data signed and unsigned retrieval APIs.
- Push/realtime channels for execution, workflow, collaboration, debug, worker, builder credits, chat hub, instance AI, webhook, and hot reload events.

## 28. CLI And Self-Hosted Operations

- Start main server.
- Run webhook process.
- Run worker process.
- Execute workflow by CLI.
- Execute batch.
- Export credentials, workflows, entities, and nodes.
- Import credentials, workflows, and entities.
- List workflows.
- Publish and unpublish workflow.
- Update workflow.
- Audit command.
- Database revert command.
- License info and clear commands.
- MFA disable command.
- LDAP reset command.
- User-management reset command.
- TTWF generate and worker-pool commands.
- Config schema and environment-driven frontend/backend settings.
- Static auth, CORS, rate limiting, proxy token management, SSRF protection, Redis client, cache, and URL service.

## 29. Cross-Cutting Product States To Model Later

- Empty, loading, error, unauthorized, read-only, disabled-by-feature-flag, unlicensed, cloud-only, self-host-only, enterprise-only, and upgrade-required states.
- Single-user, multi-user, owner, admin, member, project admin, viewer, custom-role, pending-user, and SSO-managed user states.
- Personal project, team project, shared resource, folder, archived resource, active workflow, inactive workflow, dirty workflow, and unsaved workflow states.
- Connected, disconnected, reconnect-needed, setup-needed, missing credentials, external-secret-backed, dynamic credential, and resolver-backed credential states.
- Manual, scheduled, webhook, trigger, chat, form, partial, debug, retry, failed, waiting, running, stopped, crashed, and successful execution states.
- Queue mode, main mode, worker mode, source-controlled, branch-read-only, cloud, self-host, preview/demo, and migration-report states.
