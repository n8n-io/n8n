#!/usr/bin/env node

console.error(`
The root-level dev command is no longer supported.
Use the faster and more granular dev commands inside the n8n and n8n-editor-ui packages.

+--------------------------------------------------------------------------+
| Backend (hot reload packages/cli, frontend served from dist output)      |
|                                                                          |
|   pnpm dev:be                                                            |
|                                                                          |
+--------------------------------------------------------------------------+
| Frontend (hot reload vue app, backend served from dist output)           |
|                                                                          |
|   pnpm dev:fe                                                            |
|                                                                          |
+--------------------------------------------------------------------------+
| Backend & Frontend with hot reloading                                    |
|                                                                          |
|   pnpm dev:be                                                            |
|   pnpm dev:fe:editor                                                     |
|                                                                          |
+--------------------------------------------------------------------------+
`);
process.exit(0);
