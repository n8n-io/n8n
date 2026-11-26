# API-663 spike, approach B: fully authless

Spike code for a partner platform to test. Do not merge. Context:
[API-663](https://linear.app/n8n/issue/API-663). Approach A (the credential file sends the
ORD ID) is on branch `api-663-approach-a-ord-id`. Both branches have the same n8n code. Only
the example credential file differs: here it has no fields and no `authenticate` data.

The platform runs n8n behind its own proxy and gateway. The gateway holds every
third-party secret and adds it to each outbound request. n8n must hold none.

## What it does

In managed mode, node runs use no third-party secret, and n8n stores no credential:

- Every node's credential field shows **Managed by platform**, disabled. Users cannot change
  it, and there is nothing to create.
- When a node runs, n8n builds its credential with empty secrets.
- Requests made through n8n's auth helpers have **no `Authorization` header**. Nodes that
  build their own auth header send it with an empty key (see below). No request carries an
  ORD ID.
- The platform's proxy catches the request. Its gateway maps it to the ORD ID of the API,
  checks the grant and adds the real secret. n8n needs no other setup for this: no proxy
  settings, no plug-in.

The ORD ID is the ID of one API in the platform's API registry, in the
[Open Resource Discovery](https://open-resource-discovery.github.io/specification/) format.

## Configuration

Two settings and one file:

| Part | Value | Effect |
|---|---|---|
| Credential type file | `PlatformManagedApi.credentials.js`, in a folder | Defines the managed credential. An example is in `managed-credential/`. The platform can change its name, display name and notice |
| `N8N_CUSTOM_EXTENSIONS` | The folder that holds the file | n8n loads the file at startup, the same way it loads custom nodes |
| `N8N_MANAGED_CREDENTIAL_TYPE` | `platformManagedApi` (the `name` in the file) | Turns managed mode on. Every node then uses this type. When unset, n8n works as today. When no loaded type has this name, n8n does not start |

In a Docker image, copy the folder into the image or mount it, and set both variables.

**How the setting overrides a node's credential types:** each node lists the credential
types it accepts (Slack accepts only "Slack API" and "Slack OAuth2"). In managed mode, the
editor sees the managed type as the only credential of every node. When the node runs and
asks for "Slack API", n8n gives it data built from the "Slack API" fields, with empty
secrets. The node itself does not change.

Workflows need no credential reference. Creating any credential returns `400`.

**Addresses that n8n does not know** (the Jira site, the Freshdesk domain): n8n sends the
example from the credential form, for example `https://example.atlassian.net`. The workflow
can give the real address on the node instead, and n8n then calls it directly:

```json
"credentials": { "platformManagedApi": { "id": null, "name": "Jira", "domain": "https://acme.atlassian.net" } }
```

## What the platform's proxy and gateway receive

| Part of the request | Value |
|---|---|
| Address | The node's normal target, for example `slack.com/api/chat.postMessage`. The gateway maps it to an ORD ID |
| Shared addresses | Outlook, Teams and OneDrive all call `graph.microsoft.com`. The gateway needs path rules to tell them apart |
| Address fields from the credential (Jira, self-hosted apps) | The real address if the workflow gives it on the node. If not, a placeholder, for example `https://example.atlassian.net`, that the gateway must map to the customer's system |
| `Authorization` header | None, for nodes that use n8n's auth helpers (about 63% of built-in integrations) |
| Nodes that build their own auth header (about 25%) | The header is present, with an empty key. Freshdesk, for example, sends `Basic Olg=`, the encoding of its fixed `:X` suffix. The gateway must replace it |

## Test it

```bash
pnpm build > build.log 2>&1
cd packages/cli && N8N_CUSTOM_EXTENSIONS=../../spike/api-663/managed-credential \
  N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi pnpm start
```

1. Create a workflow with a Slack node. The Credential field shows **Managed by platform**,
   disabled. There is no warning.
2. Run it. Without the platform's proxy, Slack rejects the call: the request left n8n with
   no token.
3. To see the headers, run an HTTP Request node against a server that prints them.

Unit tests:

```bash
cd packages/core && pnpm test src/execution-engine/node-execution-context/utils/__tests__/managed-credential.test.ts \
  src/execution-engine/node-execution-context/utils/request-helpers/__tests__/factory-managed-credential.test.ts
cd packages/cli && pnpm test src/__tests__/spike-managed-credential-types.test.ts
```

## Known limits

| Limit | Effect |
|---|---|
| Node signs a token itself (Google service account, S3) | Fails before sending. Google's option is hidden in the editor |
| Secret in the URL (Telegram, about 5%) | Fails before sending: n8n refuses a URL with an empty token |
| Not HTTP (databases, SSH, email, about 7%) | Cannot go through the gateway |
| HTTP Request with an SSL client certificate | The certificate credential is not offered |
| `n8n import:credentials`, and credentials stored before managed mode | Stay in the database. n8n never uses them in managed mode |

## Where the code is

| File | Change |
|---|---|
| `spike/api-663/managed-credential/PlatformManagedApi.credentials.js` | Example managed credential type |
| `packages/core/.../utils/managed-credential.ts` | Builds the node's credential data with no secret, plus the data on the node's managed reference, if any |
| `packages/core/.../node-execution-context.ts` | In managed mode, reads no stored credential |
| `packages/core/.../request-helpers/factory.ts` | Auth helpers and OAuth paths use the managed type. `httpRequest` and `request` apply its `authenticate`, which adds nothing in this file |
| `workflow-helpers.ts`, `credentials-permission-checker.ts`, `workflow.service.ee.ts` | Skip a managed reference, which has `id: null` by design, like a Gateway credits reference |
| `packages/cli/src/spike-managed-credential-types.ts` | Editor sees only the managed type; nothing can be saved |
| `packages/cli/src/credentials/credentials.service.ts` | Refuses every way to create a credential, after the access check |
| `packages/cli/src/workflows/workflow-validation.service.ts` | Publishing skips the credential check in managed mode |
| `packages/frontend/editor-ui/.../NodeCredentials.vue`, `useNodeHelpers.ts` | Disabled managed field, no "missing credential" warning |
