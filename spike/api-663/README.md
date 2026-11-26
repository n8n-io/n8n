# API-663 spike, approach A: n8n sends the ORD ID

Spike code for a partner platform to test. Do not merge. Context:
[API-663](https://linear.app/n8n/issue/API-663). Approach B (fully authless) is on branch
`api-663-approach-b-authless`.

The platform runs n8n behind its own proxy and gateway. The gateway holds every
third-party secret and adds it to each outbound request. n8n must hold none.

## What it does

In managed mode, n8n does not use third-party secrets when nodes run:

- Every node's credential field shows **Managed by platform**, disabled. Users cannot change it.
- **No credential is stored.** Each node's credential reference in the workflow JSON holds
  only an **ORD ID**, with no record behind it. Gateway credits marks a node the same way.
- Every request a node sends carries that ORD ID in the `ordID` header.
- Requests made through n8n's auth helpers have **no `Authorization` header**. Nodes that
  build their own auth header send it with an empty key (see below).
- The platform's proxy catches the request. Its gateway checks the grant and adds the real
  secret. n8n needs no other setup for this: no proxy settings, no plug-in.

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
asks for "Slack API", n8n reads the ORD ID from the node's managed reference, and gives the
node data built from the "Slack API" fields, with empty secrets. The node itself does not
change.

## What the platform does

1. **Find the ORD ID** of each application the workflow uses, in its API registry.
2. **Write it into the workflow JSON**, on every node that calls an application:

   ```json
   "credentials": { "platformManagedApi": { "id": null, "name": "Outlook", "ordId": "<ORD ID>" } }
   ```

3. **On deploy**, nothing moves but the workflow. If prod needs a different ORD ID, set it
   in the workflow JSON.

n8n refuses to create any credential in managed mode. A node with no ORD ID fails before it
sends anything, with the error `Add an ORD ID to this node's managed credential`.

## What the platform's proxy and gateway receive

| Part of the request | Value |
|---|---|
| `ordID` header | The ORD ID on the node. It replaces any `ordID` header the workflow sets |
| `Authorization` header | None, for nodes that use n8n's auth helpers (about 63% of built-in integrations) |
| Nodes that build their own auth header (about 25%) | The header is present, with an empty key. Freshdesk, for example, sends `Basic Olg=`, the encoding of its fixed `:X` suffix. The gateway must replace it |
| Address fields from the credential (Jira, self-hosted apps) | A placeholder, for example `https://example.atlassian.net`. The gateway routes by ORD ID |

## Test it

```bash
pnpm build > build.log 2>&1
cd packages/cli && N8N_CUSTOM_EXTENSIONS=../../spike/api-663/managed-credential \
  N8N_MANAGED_CREDENTIAL_TYPE=platformManagedApi pnpm start
```

1. Create a workflow with a Slack node whose `credentials` hold an ORD ID, as above.
2. Open the Slack node: the Credential field shows **Managed by platform**, disabled.
3. Run it. Without the platform's proxy, Slack rejects the call: the request left n8n with
   no token.
4. To see the headers, run an HTTP Request node (Authentication: Predefined Credential Type,
   Managed by platform) against a server that prints them.

Unit tests:

```bash
cd packages/core && pnpm test src/execution-engine/node-execution-context/utils/__tests__/managed-credential.test.ts
cd packages/cli && pnpm test src/__tests__/spike-managed-credential-types.test.ts
```

## Known limits

| Limit | Effect |
|---|---|
| Node signs a token itself (Google service account, S3) | Fails before sending. Google's option is hidden in the editor |
| Secret in the URL (Telegram, about 5%) | Fails before sending: n8n refuses a URL with an empty token |
| Not HTTP (databases, SSH, email, about 7%) | Cannot go through the gateway |
| Node uses its own HTTP client or SDK, not n8n's request helpers | The request has no `ordID` header |
| HTTP Request with an SSL client certificate | The certificate credential is not offered |
| `n8n import:credentials`, and credentials stored before managed mode | Stay in the database. n8n never uses them in managed mode |
| The disabled field shows "Managed by platform" even when the node has no ORD ID | The node fails when it runs |

## Where the code is

| File | Change |
|---|---|
| `spike/api-663/managed-credential/PlatformManagedApi.credentials.js` | Example managed credential type |
| `packages/core/.../utils/managed-credential.ts` | Reads the ORD ID from the node, builds the node's credential data, adds the ORD ID |
| `packages/core/.../node-execution-context.ts` | In managed mode, reads no stored credential |
| `packages/core/.../request-helpers/factory.ts` | Auth helpers and OAuth paths add nothing but the ORD ID |
| `packages/cli/src/spike-managed-credential-types.ts` | Editor sees only the managed type; no credential can be saved |
| `packages/cli/src/credentials/credentials.service.ts` | Refuses every way to create a credential, after the access check |
| `workflow-helpers.ts`, `credentials-permission-checker.ts`, `workflow.service.ee.ts` | Skip the managed reference, which has `id: null` by design, like a Gateway credits reference |
| `packages/cli/src/workflows/workflow-validation.service.ts` | Publishing skips the credential check in managed mode |
| `packages/frontend/editor-ui/.../NodeCredentials.vue`, `useNodeHelpers.ts` | Disabled managed field, no "missing credential" warning |
