# ENT-28 POC — Task List

Vertical slices. Each task leaves the system buildable. Sizes: S=1-2 files,
M=3-5, L=5-8.

---

## Task 1: Scaffold `@n8n/oauth2-token-validator` with JWKS validation ✅ DONE (ec4892ac39)
**Description:** Create the new package (copy structure from
`packages/@n8n/client-oauth2`). Implement `validateToken(token, options)` for
the JWKS strategy: OIDC discovery of `jwks_uri`, signature verification with
`jose`, and `exp`/`iss`/`aud` checks. Cache keys in-memory. Return the decoded
claims or throw a typed error. Also decide + stand up the local test-token
issuer here.

**Acceptance criteria:**
- [ ] `validateToken` verifies a valid RS256 JWT against a JWKS and returns claims
- [ ] Rejects expired, wrong-issuer, wrong-audience, and bad-signature tokens
- [ ] JWKS keys are fetched once and cached

**Verification:**
- [ ] `pnpm --filter @n8n/oauth2-token-validator test` passes (mock JWKS)
- [ ] `pnpm --filter @n8n/oauth2-token-validator build` succeeds

**Dependencies:** None
**Files likely touched:** new `packages/@n8n/oauth2-token-validator/**`
**Scope:** M

---

## Task 2: Create `OAuth2/OIDC Bearer Token` credential (JWKS fields) ✅ DONE (ac646a6ae0)
**Description:** New `oAuthBearerToken` credential in
`packages/nodes-base/credentials/`, modeled on `HttpBearerAuth.credentials.ts`.
Phase-1 fields: issuer/discovery URL, audience, validation mode. No
`authenticate` block (inbound-only). Register in `nodes-base/package.json`.

**Acceptance criteria:**
- [ ] Credential appears in the UI credential picker with the JWKS fields
- [ ] Registered and loads without error

**Verification:**
- [ ] `pnpm --filter n8n-nodes-base build` succeeds
- [ ] Manual: credential is creatable in the dev env UI (http://localhost:8168)

**Dependencies:** None
**Files likely touched:** `packages/nodes-base/credentials/OAuth2OidcBearer.credentials.ts`, `packages/nodes-base/package.json`
**Scope:** S

---

## Task 3: Add `oAuthBearer` branch + wire Webhook node
**Description:** Add a branch in `validateWebhookAuthentication`
(`packages/nodes-base/nodes/Webhook/utils.ts:281` area) for the new auth mode:
read the credential, pull the bearer token from the `Authorization` header, call
`@n8n/oauth2-token-validator`, throw `WebhookAuthorizationError(401|403)` on
failure. Add the option to the Webhook node's `authentication` dropdown +
`credentials` array.

**Acceptance criteria:**
- [ ] Webhook node offers "OAuth2/OIDC Bearer Token" auth option
- [ ] Valid token → workflow fires; missing/invalid → 401/403

**Verification:**
- [ ] `pnpm --filter n8n-nodes-base build` succeeds
- [ ] Manual E2E in dev env: see checkpoint below

**Dependencies:** Task 1, Task 2
**Files likely touched:** `Webhook/utils.ts`, `Webhook/description.ts`, `Webhook/Webhook.node.ts`
**Scope:** M

---

### ✅ Checkpoint A (after Tasks 1-3): JWKS path proven end-to-end
- [ ] Short-lived JWT from the test issuer fires the Webhook
- [ ] Expired/invalid token returns 401/403
- [ ] Builds clean; package unit tests pass
- [ ] **Human review — confirm the shape before layering more**

---

## Task 4: Add RFC 7662 introspection strategy to the validator
**Description:** Lift the introspection logic from
`packages/cli/.../identifiers/oauth2-introspection-identifier.ts` into the
package, decoupled from `CacheService`/credential-resolver. Support
`client_secret_basic` and `client_secret_post`. `validateToken` dispatches on
the credential's validation mode. Return claims from the introspection response.

**Acceptance criteria:**
- [ ] Opaque token validated via a POST to the introspection endpoint
- [ ] `active:false` / revoked token is rejected
- [ ] Both client-auth methods work

**Verification:**
- [ ] Package unit tests pass (`nock` for the introspection endpoint)

**Dependencies:** Task 1
**Files likely touched:** `packages/@n8n/oauth2-token-validator/src/**`
**Scope:** M

---

## Task 5: Extract `@n8n/expression-rules` from role-resolver
**Description:** New package wrapping `Expression.resolveWithoutWorkflow`
(role-resolver:129) + a claims-context builder, exposing an `evaluate(claims,
rules)` that applies **deny-wins** semantics over a list of allow/deny
expression rules. Do NOT rewire role-resolver itself in the spike (note as M2).

**Acceptance criteria:**
- [ ] `evaluate` returns allow when an allow rule matches and no deny matches
- [ ] A matching deny rule overrides any allow (deny-wins)
- [ ] Expression errors are treated as non-match (safe default)

**Verification:**
- [ ] `pnpm --filter @n8n/expression-rules test` passes
- [ ] `pnpm --filter @n8n/expression-rules build` succeeds

**Dependencies:** None
**Files likely touched:** new `packages/@n8n/expression-rules/**`
**Scope:** M

---

## Task 6: Wire claim-rule check into the auth branch
**Description:** After token validation in the auth branch, pass the claims +
the credential's rule list to `@n8n/expression-rules`; throw 403 on deny. Add
claim-rule fields (introspection endpoint, client id/secret, rule list) to the
credential.

**Acceptance criteria:**
- [ ] Trigger fires only when claims satisfy the rules
- [ ] Non-matching caller → 403; deny-wins honored

**Verification:**
- [ ] `pnpm --filter n8n-nodes-base build` succeeds
- [ ] Manual E2E: token with `groups:[admin]` passes a "groups includes admin" rule; without it → 403

**Dependencies:** Task 3, Task 4, Task 5
**Files likely touched:** `Webhook/utils.ts`, `OAuth2OidcBearer.credentials.ts`
**Scope:** M

---

### ✅ Checkpoint B (after Tasks 4-6): full validation + ACL
- [ ] Both JWKS and introspection paths work
- [ ] Claim ACL allows/denies correctly; deny-wins verified
- [ ] All package unit tests pass

---

## Task 7: Wire MCP Trigger node
**Description:** Add the new auth option to the MCP Trigger node's
`authentication` dropdown + `credentials` array
(`McpTrigger.node.ts:62-97`). The shared `validateWebhookAuthentication` already
gives it the behavior — this is registration only.

**Acceptance criteria:**
- [ ] MCP Trigger offers the OAuth2/OIDC Bearer option
- [ ] Valid token reaches the MCP handler; invalid → 401/403

**Verification:**
- [ ] `pnpm --filter @n8n/n8n-nodes-langchain build` succeeds
- [ ] Manual E2E against the MCP Trigger endpoint

**Dependencies:** Task 6
**Files likely touched:** `packages/@n8n/nodes-langchain/nodes/mcp/McpTrigger/McpTrigger.node.ts`
**Scope:** S

---

## Task 8: Findings, tickets, walkthrough
**Description:** Write up findings/gaps. Create the M1 implementation tickets in
Linear (validator+credential, Webhook wiring, MCP wiring, `@n8n/expression-rules`
extraction, claim ACL, docs) with POC-informed estimates. Record the
knowledge-share video.

**Acceptance criteria:**
- [ ] All six M1 tickets created with estimates + noted unknowns
- [ ] Findings doc committed (JWKS caching, introspection latency, claim-ACL UX)
- [ ] Walkthrough video recorded

**Verification:**
- [ ] Tickets visible in Linear, linked back to ENT-28

**Dependencies:** Task 7
**Files likely touched:** `tasks/findings.md` + Linear (no code)
**Scope:** S

---

### ✅ Checkpoint C: Spike complete
- [ ] Both triggers gated end-to-end by OIDC tokens
- [ ] Tickets + estimates + video done
- [ ] Unknowns documented
