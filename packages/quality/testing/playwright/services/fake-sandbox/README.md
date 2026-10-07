# Fake sandbox service

The fake sandbox service is a small HTTP server for tests. It speaks the API of
the n8n sandbox service that `@n8n/sandbox-client` calls. It keeps the files of
each sandbox in memory. It answers every command with exit code 0 and no
output. It does not run commands.

This code is for tests only. It is not part of the n8n product.

## Why the tests need it

With `N8N_INSTANCE_AI_SANDBOX_ENABLED=true`, each Assistant turn creates a
sandbox and writes the skills to it before it calls the model. Without a
sandbox, the Assistant shows its setup screen. The fake service lets the e2e
tests use the Assistant without a real sandbox.

## Use it

```ts
import { startFakeSandbox } from '../services/fake-sandbox/fake-sandbox.server';

const sandbox = await startFakeSandbox({ port: 5798 });
// Start n8n with N8N_SANDBOX_SERVICE_URL=sandbox.url.
// ...
expect(sandbox.commands()).toContain('echo $HOME');
await sandbox.stop();
```

The server binds to `127.0.0.1`. It uses a free port unless you set `port`.
`sandboxIds()` lists the sandboxes that exist. `commands()` lists the commands
that the sandboxes received.

The server supports these routes:

| Route | Result |
|---|---|
| `POST /sandboxes` | Creates a sandbox. A known `id` returns the existing sandbox. |
| `GET`, `DELETE /sandboxes/:id` | Reads or deletes a sandbox. |
| `POST /sandboxes/:id/executions` | Records the command. Streams a `started` and an `exit` event (exit code 0). |
| `DELETE /sandboxes/:id/executions/:exec` | Does nothing. |
| `PUT`, `POST`, `DELETE`, `GET /sandboxes/:id/files` | Writes, appends, deletes or lists files. |
| `GET /sandboxes/:id/files/content` | Reads a file. |
| `POST /sandboxes/:id/mkdir` | Creates a directory. |
| `GET /sandboxes/:id/stat` | Describes a file or directory. |

Other routes, such as copy and move, answer 404. Errors use the shape
`{ "error": "<message>" }`, which the client reads.
