# API-663 spike: managed credentials

Spike code for a partner platform to test. Do not merge. Context:
[API-663](https://linear.app/n8n/issue/API-663).

The platform runs n8n behind its own proxy and gateway. The gateway holds every
third-party secret and adds it to each outbound request. n8n must hold none.

**One n8n change, two configurations.** The n8n code is the same for both approaches. The
credential type file that the platform loads decides the approach:

| Approach | Example file | What leaves n8n |
|---|---|---|
| A: the credential file sends the ORD ID | `approach-a/PlatformManagedApi.credentials.js` | Each request carries the ORD ID on the node, as an `ordID` header |
| B: fully authless | `approach-b/PlatformManagedApi.credentials.js` | Nothing is added. The gateway finds the ORD ID from the address |

The ORD ID is the ID of one API in the platform's API registry, in the
[Open Resource Discovery](https://open-resource-discovery.github.io/specification/) format.

## What it does

In managed mode, n8n does not use third-party secrets when nodes run:

- Every node's credential field shows **Managed by platform**, disabled. Users cannot change it.
- **No credential is stored.** n8n refuses to create any credential. A node's credential
  reference in the workflow JSON has `id: null` and, in A, the platform's data, such as the
  ORD ID. Gateway credits marks a node the same way.
- When a node runs, n8n builds its credential with empty secrets, plus the data on the
  node's reference. Then it applies the file's `authenticate` block to every request of the
  node, including nodes that build their own auth header. n8n has no ORD ID logic.
- n8n adds **no `Authorization` header**. Nodes that build their own auth header send it
  with an empty key.
- The platform's proxy catches the request. Its gateway checks the grant and adds the real
  secret. n8n needs no other setup for this: no proxy settings, no plug-in.

## Configuration

Two settings and one file:

| Part | Value | Effect |
|---|---|---|
| Credential type file | `PlatformManagedApi.credentials.js`, in a folder | Defines the managed credential. The platform can change its name, display name, notice, fields and `authenticate` |
| `N8N_CUSTOM_EXTENSIONS` | The folder that holds the file. Use one approach folder, not both | n8n loads the file at startup, the same way it loads custom nodes |
| `N8N_MANAGED_CREDENTIAL_TYPE` | `platformManagedApi` (the `name` in the file) | Turns managed mode on. Every node then uses this type. When unset, n8n works as today. When no loaded type has this name, n8n does not start |

In a Docker image, mount the folder and set both variables. To change the approach, mount
the other folder and restart.

**How the setting overrides a node's credential types:** each node lists the credential
types it accepts (Slack accepts only "Slack API" and "Slack OAuth2"). In managed mode, the
editor sees the managed type as the only credential of every node. When the node runs and
asks for "Slack API", n8n gives it data built from the "Slack API" fields, with empty
secrets, plus the data on the node's managed reference. The node itself does not change.

**How `authenticate` reaches every request:**

| How the node sends the request | What applies the file's `authenticate` |
|---|---|
| Through n8n's auth helpers, OAuth1, OAuth2, or declared in the node | n8n's auth helper, as for any credential |
| Through `httpRequest` or `request`, with its own auth header (Freshdesk) | n8n, when the node has a managed reference |
| Node without a credential (RSS Read) | Nothing. The request is not changed |

A field marked `required` in the file must be on the node. If it is not, the node fails
before it sends anything, for example with `Add ordId to this node's managed credential`.

## Approach A: what the platform does

1. **Find the ORD ID** of each application the workflow uses, in its API registry.
2. **Write it into the workflow JSON**, on every node that calls an application, with the
   public API (`POST /api/v1/workflows` or `PUT /api/v1/workflows/{id}`):

   ```json
   "credentials": { "platformManagedApi": { "id": null, "name": "Outlook", "ordId": "<ORD ID>" } }
   ```

3. **Send it from the credential file.** The example sends the `ordID` header. The platform
   can use another header name, or the query string (`qs`) instead. A header is safer: a
   query parameter goes on to the application unless the proxy removes it.
4. **On deploy**, nothing changes but the workflow. If prod needs a different ORD ID, set it
   in the workflow JSON.

## Approach B: what the platform does

1. **Map each host to an ORD ID** in the gateway. Most hosts have one API.
2. **Map paths for hosts with several APIs.** Outlook, Teams and OneDrive all call
   `graph.microsoft.com`.

Workflows need no data on the node.

## Addresses that n8n does not know

For the Jira site or the Freshdesk domain, n8n sends the example from the credential form,
for example `https://example.atlassian.net`. In both approaches, the workflow can give the
real address on the node instead, and n8n then calls it directly:

```json
"credentials": { "platformManagedApi": { "id": null, "name": "Jira", "domain": "https://acme.atlassian.net" } }
```

## What the platform's proxy and gateway receive

| Part of the request | Approach A | Approach B |
|---|---|---|
| `ordID` header | The ORD ID on the node. It replaces an `ordID` header that the workflow sets | Not sent |
| `Authorization` header | None | None |
| Nodes that build their own auth header (about 25%) | An `Authorization` header with an empty key. Freshdesk, for example, sends `Basic Olg=`. The gateway must replace it. The `ordID` header is also there | The same, with no `ordID` header |
| Address fields from the credential (Jira, self-hosted apps) | The real address if the workflow gives it on the node. If not, a placeholder, for example `https://example.atlassian.net` | Same as A |

## Test it

```bash
pnpm build > build.log 2>&1
cd packages/cli && N8N_CUSTOM_EXTENSIONS=../../spike/api-663/approach-a \
  N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi pnpm start
```

For Approach B, use `../../spike/api-663/approach-b`.

1. Create a workflow with a Slack node. In A, give its `credentials` an ORD ID, as above.
2. Open the Slack node: the Credential field shows **Managed by platform**, disabled.
3. Run it. Without the platform's proxy, Slack rejects the call: the request left n8n with
   no token.
4. To see the headers, run an HTTP Request node (Authentication: Predefined Credential Type,
   Managed by platform) against a server that prints them.

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
| Node uses a vendor SDK, not n8n's request helpers (AI model nodes) | `authenticate` is not applied. Not tested |
| HTTP Request with an SSL client certificate | The certificate credential is not offered |
| `n8n import:credentials`, and credentials stored before managed mode | Stay in the database. n8n never uses them in managed mode |
| Approach A: the disabled field shows "Managed by platform" even when the node has no ORD ID | The node fails when it runs |

## Where the code is

| File | Change |
|---|---|
| `spike/api-663/approach-a/`, `spike/api-663/approach-b/` | Example managed credential type for each approach |
| `packages/core/.../utils/managed-credential.ts` | Reads the data on the node's managed reference, checks required fields, builds the node's credential data |
| `packages/core/.../node-execution-context.ts` | In managed mode, reads no stored credential |
| `packages/core/.../request-helpers/factory.ts` | Auth helpers and OAuth paths use the managed type. `httpRequest` and `request` also apply its `authenticate` |
| `packages/cli/src/spike-managed-credential-types.ts` | Editor sees only the managed type; no credential can be saved |
| `packages/cli/src/credentials/credentials.service.ts` | Refuses every way to create a credential, after the access check |
| `workflow-helpers.ts`, `credentials-permission-checker.ts`, `workflow.service.ee.ts` | Skip the managed reference, which has `id: null` by design, like a Gateway credits reference |
| `packages/cli/src/workflows/workflow-validation.service.ts` | Publishing skips the credential check in managed mode |
| `packages/frontend/editor-ui/.../NodeCredentials.vue`, `useNodeHelpers.ts` | Disabled managed field, no "missing credential" warning |
