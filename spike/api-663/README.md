# API-663 spike: managed credentials

Spike code for a partner platform to test. Do not merge. Context:
[API-663](https://linear.app/n8n/issue/API-663).

The platform runs n8n behind its own proxy and gateway. The gateway holds every
third-party secret and adds it to each outbound request. n8n must hold none.

## What it does

- **One credential type with no secret fields.** The platform loads it from a file, the same
  way as custom nodes.
- **One credential of that type for the whole instance.** The platform creates it once, as a
  global credential, so that every project can use it. It holds no secret.
- **Every node uses it.** The editor offers only this credential type, and selects the one
  credential automatically. The credential field is the normal picker.
- **Nodes run unchanged.** When a node asks for its own type, for example "Slack API", n8n
  gives it that type's fields with empty secrets. Address fields get their default or a
  placeholder.
- **No `Authorization` header.** n8n authenticates with the managed type, which adds nothing.
  Nodes that build their own auth header send it with an empty key.
- **The platform's roles control credentials.** n8n has no lock of its own. A credential that
  holds a secret can still be stored, but no node can use it in managed mode.

## Configuration

| Part | Value | Effect |
|---|---|---|
| Credential type file | `managed-credential/PlatformManagedApi.credentials.js` | Defines the managed credential type. The platform can change its name, display name, icon and notice |
| `N8N_CUSTOM_EXTENSIONS` | The folder that holds the file | n8n loads the file at startup |
| `N8N_MANAGED_CREDENTIAL_TYPE` | `platformManagedApi` (the `name` in the file) | Turns managed mode on. When unset, n8n works as today. When no loaded type has this name, n8n does not start |

## Create the credential

At first startup, before `n8n start`:

```bash
n8n import:credentials --input=managed-credential.json
```

```json
[{ "id": "managedcred00001", "name": "Managed by platform", "type": "platformManagedApi", "data": {}, "isGlobal": true }]
```

A fixed `id` is the same in every environment, so a workflow JSON works everywhere. The
public API also works: `POST /api/v1/credentials`, then set `isGlobal` with
`PATCH /api/v1/credentials/{id}` (needs the sharing license).

Workflows that the platform creates refer to the credential by its id:

```json
"credentials": { "platformManagedApi": { "id": "managedcred00001", "name": "Managed by platform" } }
```

A reference by name only (`"id": null`) resolves only in the project that owns the
credential.

## Test it

```bash
pnpm build > build.log 2>&1
export N8N_CUSTOM_EXTENSIONS=$PWD/spike/api-663/managed-credential N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi
./packages/cli/bin/n8n import:credentials --input=managed-credential.json
cd packages/cli && pnpm start
```

1. Add a Slack node. The credential field shows **Managed by platform**, selected.
2. Run it. Without the platform's proxy, Slack rejects the call with `not_authed`: the
   request left n8n with no token.
3. To see the headers, run an HTTP Request node (Authentication: Predefined Credential Type,
   Managed by platform) against a server that prints them.

Unit tests:

```bash
cd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/node-execution-context.test.ts \
  src/execution-engine/node-execution-context/utils/__tests__/managed-credential.test.ts \
  src/execution-engine/node-execution-context/utils/request-helpers/__tests__/factory-managed-credential.test.ts
cd packages/cli && pnpm test src/__tests__/spike-managed-credential-types.test.ts
```

## Known limits

| Limit | Effect |
|---|---|
| Node signs a token itself (Google service account) | Fails before sending. The option is still visible in the editor |
| Secret in the URL (Telegram) | Fails before sending: n8n refuses a URL with an empty token |
| Not HTTP (databases, SSH, email) | Cannot go through the gateway |
| Node uses a vendor SDK, not n8n's request helpers (AI model nodes) | Not tested |
| No credential test | The managed type defines none |

## Where the code is

| File | Change |
|---|---|
| `spike/api-663/managed-credential/` | Example managed credential type |
| `packages/cli/src/spike-managed-credential-types.ts` | In managed mode, every node's credential list is the managed type, and the editor gets only that type |
| `packages/core/.../node-execution-context.ts` | Any node can use the managed credential. It gets its own type's fields with empty secrets |
| `packages/core/.../utils/managed-credential.ts` | Fills those fields with defaults and placeholders |
| `packages/core/.../request-helpers/factory.ts` | Auth helpers and OAuth paths authenticate with the managed type |
