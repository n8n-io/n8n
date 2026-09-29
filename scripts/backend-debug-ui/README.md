# Backend bench

A loopback page for backend work in one n8n checkout. It is a dev tool. n8n
does not ship it, and it does not start the n8n process.

The page shows four layers:

- **Public API** — routes under `/api/v1`
- **CLI REST** — routes under `/rest`
- **Services** — domain modules under `packages/cli/src/modules`, plus the CLI service folder
- **Database** — entities, columns, and repositories

Select a domain to fade unrelated rows. Select a route to call it. The call
panel shows the response, a JSON pointer slice, and a diff against the previous
response. A route also lists the services, repositories, and entities it
references, and any `to…` transform in that controller file.

## Start

From the checkout:

```sh
pnpm backend:debug
```

The main checkout (`.git` is a directory) uses these ports:

| Process | Port |
| --- | --- |
| Backend bench | 4317 |
| n8n | 5678 |

Open `http://127.0.0.1:4317`.

Start n8n in another terminal when you want live calls:

```sh
pnpm dev:be
```

A linked git worktree does not use 4317 or 5678. The bench hashes the worktree
path and prints both ports. Start n8n with the `N8N_PORT` value it prints.

```sh
N8N_PORT=5680 pnpm dev:be
pnpm backend:debug
```

Use the printed port. The sample above is only a shape, not a fixed value.

## Parallel checkouts

Run `pnpm backend:debug` in each checkout. Each process binds its own port.
Superset creates a git worktree per workspace. Open a terminal in that
worktree and run the same command. A second Superset workspace can run it at
the same time.

Set these variables when you need a fixed port:

| Variable | Effect |
| --- | --- |
| `N8N_BACKEND_DEBUG_PORT` | Bench port |
| `N8N_PORT` | n8n port the bench calls |
| `N8N_ENDPOINT_REST` | REST prefix, when this checkout does not use `rest` |

Do not put secrets in the command. Paste a session cookie or an API key into
the page. The page keeps them in that browser tab only.

## Refresh

The bench watches:

- `packages/cli/src`
- `packages/@n8n/db/src/entities`
- `packages/@n8n/db/src/repositories`
- `scripts/backend-debug-ui/ui`

A change to a controller, service, entity, or repository rebuilds the map.
The page keeps the filter, the draft call, and the last response. A change
under `ui/` swaps the page module and the stylesheet without a full reload.
Restart `pnpm backend:debug` after you edit `server.mjs` or `catalog.mjs`.

## Limits

The bench reads source files. It does not attach a debugger, and it does not
run a service method inside the n8n process. Request bodies are JSON. The
proxy accepts `/rest` and `/api/v1` only, on `127.0.0.1`. Do not tunnel or
port-forward the bench.

Root-level controllers, such as the MCP server routes, are outside this map.

## Tests

```sh
pnpm backend:debug:test
```
