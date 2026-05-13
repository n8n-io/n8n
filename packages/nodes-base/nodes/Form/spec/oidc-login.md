# Form Trigger: OAuth2 / OIDC user login

Status: draft spec — implementation not started
Owner: forms team
Linear ticket: _(to be added)_

## 1. Summary

Add a third authentication option to the Form trigger — alongside `None` and `Basic Auth` — that lets a form be gated by an OAuth2 / OIDC identity provider. Each form visitor is sent through an authorization-code flow against the configured provider, and once the flow completes, the form renders for that visitor with their identity available to the workflow.

Distinct from how OAuth2 credentials are used elsewhere in n8n: we do **not** consume the access token stored on the credential record. The credential is treated as OAuth client configuration only (client id, client secret, endpoints, scopes). Every form visitor produces their own short-lived tokens, which are never persisted to the database and never appear in any URL.

## 2. Goals & non-goals

**Goals**
- Restrict access to a public form to users who can authenticate against a configured OAuth2/OIDC provider.
- Make the authenticated user's identity (claims) available in the trigger output, so downstream workflow nodes can use it (e.g., to send a notification with the user's email).
- Work for single-page and multi-page (wait/resume) forms.
- Zero new persistent storage: tokens and claims never touch the database except through the explicit workflow output the builder opted into.
- The Form Trigger node code does not access credential contents. All credential reads happen in platform-level code — a new helper on `IWebhookFunctions` for the redirect step, and a new controller for the token exchange. See §4.4.

**Non-goals**
- Not a replacement for n8n's own auth system. This protects only the form, not the wider instance.
- Not a token broker for downstream API calls. We do not refresh or store the user's access token for later workflow steps.
- Not full SAML / WS-Federation. OAuth2 / OIDC only.
- Not OIDC RP-Initiated Logout. Logout is local to the form (see §5.5).
- No "session" beyond the lifetime of a single rendered form. Page reload = re-auth.
- No re-authentication at waiting form pages — identity is captured once, at the trigger (see §4.10).

> **Explicitly deferred — DO NOT IMPLEMENT as part of this work**
>
> **Render-time `{{ $user.* }}` template substitution in form title, description, HTML blocks, or field defaults.**
>
> This would let builders write `Hi {{ $user.given_name }}` in form copy and have it interpolated server-side at render time. Doing it well requires expression-engine integration plus typed autocomplete in the editor UI, and is too large for the initial slice.
>
> Implementation agents: when implementing this spec, treat this feature as out of scope. The session JWT will carry the claims and the trigger output will expose them, so a follow-up can add this capability without breaking changes. Do not add `$user` to any expression scope, do not register any expression alias, and do not call any expression interpolator over the form's static strings.

## 3. User perspective

### 3.1 Form builder (n8n user creating the workflow)

In the `Form Trigger` node, **Authentication** dropdown gains a new option:

```
Authentication: [ None | Basic Auth | OAuth2 / OIDC Login ]
```

When `OAuth2 / OIDC Login` is selected the node shows:

1. **Credential** picker — uses an existing generic `OAuth2 API` credential. The platform reads the credential's `clientId`, `clientSecret`, `authUrl`, `accessTokenUrl`, and `scope` *outside* the node itself (see §4.4). Any token already stored on the credential is ignored. The credential's redirect URI must be set to the fixed callback URL surfaced in the node UI (see §4.2). Builder is shown a copy-button with that URL.
2. **User info URL** (string, optional) — endpoint that returns OIDC-style JSON claims for the bearer access token. If empty, only the ID token claims are used (so `openid` scope must be in the credential or no identity will be available).
3. **Output field name** (string, default `user`) — name of the field on the trigger's output item under which the merged claims will be placed. Empty value disables claim inclusion entirely. The output item shape becomes:
   ```jsonc
   {
     "submittedAt": "...",
     "formMode": "...",
     "<output-field-name>": { "sub": "...", "email": "...", "name": "...", ... }
   }
   ```
4. **Show "logged in as" banner** (boolean, default `true`) — see §3.2.

Builders access user identity in downstream workflow nodes via the normal expression mechanism: `{{ $('Form Trigger').first().json.user.email }}` etc. This works at workflow execution time. (Render-time interpolation of `{{ $user.* }}` inside the form's own title / description / fields is deferred — see callout under §2.)

### 3.2 Form visitor (end user filling the form)

First visit:

1. Visitor opens the form URL.
2. Browser is redirected to the IDP's `authUrl`.
3. Visitor signs in at the IDP.
4. IDP redirects to n8n's `/form-oauth/callback`.
5. n8n exchanges the code, calls the user info endpoint (if configured), drops the IDP tokens, and renders the form. The URL bar settles on the form's canonical webhook URL — no token appears in the URL at any point.

Once authenticated, just above the form fields the visitor sees (when "Show logged in as banner" is enabled):

> Logged in as **Jane Doe** (jane@example.com) — not you? [Log out](#)

Display name resolution order: `name` → `preferred_username` → `email` → `sub`. Email line is omitted if the `email` claim is missing.

This banner is populated by the server from the session JWT claims directly — it is not driven by the expression engine.

### 3.3 Worked example

A "request time off" form:
- OAuth-gated against the company Google Workspace IDP.
- Output field name: `user`.
- A downstream Slack node uses `{{ $('Form Trigger').first().json.user.email }}` to DM the requester's manager.
- An HR review node uses `$json.user.name` to address the request by display name in the message body.

The builder never had to add a "name" or "email" field to the form, and the workflow can trust the identity (it came from the IDP, not user input).

For v1 the form description and field labels remain static text — no per-visitor personalization in the form copy itself. The deferred `{{ $user.* }}` feature will add that later.

## 4. Technical spec

### 4.1 Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as Browser
  participant N as FormTrigger webhook
  participant CB as /form-oauth/callback (controller)
  participant IDP as OAuth2/OIDC provider

  U->>N: GET /webhook/<form-path>
  N->>N: validateWebhookAuthentication — no session JWT in request
  N->>N: helpers.getWebhookOauthRedirectUrl() — reads credential, mints state JWT, builds IDP URL
  N->>N: throw WebhookOauthAuthorizationError(redirectUrl)
  N-->>U: 302 to IDP authorize URL
  U->>IDP: GET /authorize
  IDP-->>U: Login UI
  U->>IDP: Submit credentials
  IDP-->>U: 302 to /form-oauth/callback?code=...&state=...
  U->>CB: GET /form-oauth/callback?code=...&state=...
  CB->>CB: Verify state JWT (signature, exp, nonce)
  CB->>CB: Load credential by (wf, node) from state JWT
  CB->>IDP: POST /token (code, client_id, client_secret)
  IDP-->>CB: { access_token, id_token, ... }
  alt user info URL configured
    CB->>IDP: GET <userinfo URL> with bearer access_token
    IDP-->>CB: { sub, name, email, ... }
  end
  CB->>CB: Drop access_token / id_token / refresh_token
  CB->>CB: Mint signed session JWT { wf, node, claims, exp }
  CB-->>U: 200 HTML — self-submitting <form> POSTing session JWT to /webhook/<form-path>
  U->>N: POST /webhook/<form-path> with __form_auth_init=<session JWT>
  N->>N: validateWebhookAuthentication — verify session JWT
  N-->>U: 200 form HTML — session JWT in hidden field; history.replaceState to canonical URL
  U->>N: POST /webhook/<form-path> (form data + hidden form_auth field)
  N->>N: validateWebhookAuthentication — verify form_auth JWT, extract claims
  N-->>Workflow: Trigger fires with claims at <output-field-name>
```

Key properties:
- The session JWT **never appears in a URL**. It transits from callback to form via a self-submitting POST, and lives only inside the form's hidden field after that.
- `history.replaceState` rewrites the current history entry's URL to the canonical form URL, so browser history, bookmarks, and back-navigation show no token-bearing URL.
- The `code` / `state` query params on `/form-oauth/callback` *do* land in browser history, but both are single-use (code consumed by token exchange; state has a 10-minute exp + nonce) and therefore not replayable.

### 4.2 New endpoint: `GET /form-oauth/callback`

Registered alongside [`oauth2-credential.controller.ts`](../../../../cli/src/controllers/oauth/oauth2-credential.controller.ts) as a new `form-oauth.controller.ts` in [`packages/cli/src/controllers/`](../../../../cli/src/controllers/). Unauthenticated route.

A new controller — not extending the existing OAuth2 controller — because the existing one is built around the "credential owner authorizes, store token to DB" model. We want the opposite: per-visitor authorization, no DB writes, hand back claims in a signed envelope.

- **Inputs**: `code`, `state` (signed JWT — see §4.7).
- **Behaviour**:
  1. Verify `state` JWT signature and `exp`.
  2. Load workflow + node and credential by the `wf` / `node` claims in `state`. Read `clientId`, `clientSecret`, `accessTokenUrl`, and the node's `userInfoUrl` parameter.
  3. POST to `accessTokenUrl` with `code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`.
  4. If `id_token` is present in the token response, decode it. If signing-key validation is desired, fetch JWKS from the issuer's `jwks_uri` (lazy, in-memory cache only — never persisted).
  5. If `userInfoUrl` is set, fetch with `Authorization: Bearer <access_token>`.
  6. Merge claims: `{ ...idTokenClaims, ...userinfoClaims }` (userinfo wins on conflicts). Drop standard JWT housekeeping claims (`iat`, `nbf`, `at_hash`, `c_hash`, `nonce`, `jti`).
  7. **Drop `access_token`, `id_token`, `refresh_token`** — they are not retained beyond this request scope.
  8. Mint the session JWT (§4.7) and respond `200` with the HTML bootstrap below.
- **Bootstrap HTML response** (no redirect — keeps the session JWT out of the URL):
   ```html
   <!doctype html>
   <html><body>
     <noscript>JavaScript is required to complete sign-in.</noscript>
     <form id="bootstrap" method="POST" action="<form webhook URL>">
       <input type="hidden" name="__form_auth_init" value="<session JWT>">
     </form>
     <script>document.getElementById('bootstrap').submit()</script>
   </body></html>
   ```
- **Errors**: render a neutral `form-trigger-auth-error.handlebars` on signature failure, expired state, failed token exchange, or `error=access_denied` from the IDP. Do not leak provider error details.
- **Security headers**: both the bootstrap success response and the auth-error response must apply the same sandbox CSP that the form-trigger and waiting-form templates already use — `getHtmlSandboxCSP()` from `n8n-core`, gated by `isFormHtmlSandboxingDisabled()` as a kill-switch. Mirrors the pattern in [`renderForm`](../utils/utils.ts#L570) and [`WaitingForms.executeWebhook`](../../../../cli/src/webhooks/waiting-forms.ts#L114). The CSP value (`sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols`) permits the bootstrap's inline `<script>` (via `allow-scripts`) and the auto-submit POST to the form webhook URL (via `allow-forms`), while keeping the page in a unique sandboxed origin — so the post-IDP-redirect page cannot read any other origin's state.

### 4.3 Integration via `validateWebhookAuthentication`

Rather than putting OIDC handling directly into `formWebhook`, we extend the existing webhook auth helper [`validateWebhookAuthentication`](../../Webhook/utils.ts#L235) and reuse its error-throwing pattern for signalling. This keeps the Form Trigger node a pure renderer and makes the OAuth-login auth mode reusable across other webhook-triggered nodes in the future (e.g., a Chat trigger).

Three new pieces:

**1. New error class** in [`packages/nodes-base/nodes/Webhook/utils.ts`](../../Webhook/utils.ts), exported next to `WebhookAuthorizationError`:
```ts
export class WebhookOauthAuthorizationError extends WebhookAuthorizationError {
  constructor(public readonly redirectUrl: string) {
    super(401, 'OAuth login required');
  }
}
```
Existing `instanceof WebhookAuthorizationError` checks throughout the codebase continue to work — they catch the subclass and emit 401. New `instanceof WebhookOauthAuthorizationError` checks at form catch sites upgrade the response to a 302 on GET requests.

**2. New helper on `IWebhookFunctions.helpers`**, declared in [`packages/workflow/src/interfaces.ts`](../../../../workflow/src/interfaces.ts) and implemented in [`packages/core`](../../../../core/src):
```ts
getWebhookOauthRedirectUrl(opts?: { reauth?: boolean }): Promise<string>;
```
Implementation responsibilities:
- Read the configured `oAuth2Api` credential via `CredentialsHelper` (this is where decryption happens — outside the node).
- Mint the state JWT (§4.7) using the instance encryption key.
- Build the IDP authorize URL: `authUrl?response_type=code&client_id=<clientId>&redirect_uri=<callback URL>&scope=<scope>&state=<state JWT>`. Append `&prompt=login` when `reauth` is true.
- Return the URL.

Naming rationale: the name is deliberately framework-generic (`Webhook`, not `Form`) and uses `get…` to make clear it's a pure URL builder — it does not initiate any flow, perform I/O, or trigger redirects on its own. Callers decide what to do with the URL.

**3. Extension to `validateWebhookAuthentication`**: a new `oauthLogin` branch in the existing auth-mode switch. Behaviour:
- Look in the request body for `__form_auth_init` (auth bootstrap POST) or `form_auth` (form submission POST).
- If found, verify the value as a session JWT against the instance signing key. On valid → return. On invalid (tampered / expired) → fall through to the missing-auth path.
- If missing or invalid: call `context.helpers.getWebhookOauthRedirectUrl()` (with `reauth: true` if the inbound request has `?reauth=1`), throw `WebhookOauthAuthorizationError(redirectUrl)`.

**Catch site in [`formWebhook`](../utils/utils.ts#L621)**:
```ts
} catch (error) {
  if (error instanceof WebhookOauthAuthorizationError) {
    if (req.method === 'GET') {
      res.redirect(302, error.redirectUrl);
    } else {
      res.status(401).send();
    }
    return { noWebhookResponse: true };
  }
  if (error instanceof WebhookAuthorizationError) {
    res.setHeader('WWW-Authenticate', 'Basic realm="..."');
    res.status(401).send();
    return { noWebhookResponse: true };
  }
  throw error;
}
```
Order matters — the subclass check comes first.

**Method-based 302 vs 401**: a `GET` without a valid session always 302s to the IDP (browser navigation case). A `POST` without a valid session always returns 401 — this covers (a) someone POSTing the form URL directly without first authenticating, and (b) an expired session at submission time. A form client (browser) treats the 401 as "reload to re-authenticate". A future JSON-API form mode (out of scope, see §8) can build on this 401 by returning the redirect URL in a JSON body for programmatic clients.

**Dispatch after successful validation**: `formWebhook` selects the response path by inspecting body content (not method alone):
- `__form_auth_init` present → render the form (page 1, with banner + hidden `form_auth`). Treated as the post-auth bootstrap; behaves like a GET render.
- `form_auth` + form fields present → process submission (existing path; claims are attached to the return item under `userOutputField`).

### 4.4 Credential access boundary

A hard architectural rule: **the Form Trigger node webhook code does not call `getCredentials()` or otherwise read credential contents directly**. Credential data is touched only inside:
- The `getWebhookOauthRedirectUrl` helper on `IWebhookFunctions` (implementation in `packages/core`), to read `clientId`, `authUrl`, `scope` when building the IDP URL.
- The `/form-oauth/callback` controller, to read `clientId`, `clientSecret`, `accessTokenUrl` when exchanging the code.

Why:
- Limits the surface where decrypted secrets are deserialised.
- Keeps the node webhook a pure renderer: read config, validate signed JWTs via the shared helper, emit HTML. No I/O against an external IDP, no direct credential I/O.
- Lets the helper and controller reuse the existing `CredentialsHelper` / `CredentialsService` (DI'd, audited, already used by [`oauth2-credential.controller.ts`](../../../../cli/src/controllers/oauth/oauth2-credential.controller.ts)).

What the node webhook *does* know:
- Auth mode (`oauthLogin`) — from its own config.
- The configured credential's ID — just the ID reference, not its contents.
- The user-info URL — a plain config field on the node, not a secret.
- Output field name, banner toggle, other display options.

What the node webhook *does not* know:
- `clientId`, `clientSecret`, `authUrl`, `accessTokenUrl`, `scope` — read only inside the helper / controller.
- The IDP's `access_token`, `id_token`, `refresh_token` — held only in the callback's request scope, dropped before responding.

The state JWT carries `{ workflowId, nodeId, ... }` — *not* credential data — so that the callback controller re-derives which credential to use from the workflow definition, not from trust-on-URL claims.

### 4.5 Why an internal session JWT, not the IDP's tokens

After auth completes, n8n mints its own short-lived HMAC-signed JWT containing the merged claims. The IDP's `access_token` / `id_token` / `refresh_token` are not used past the callback.

This is the **standard relying-party pattern** for OIDC web apps. OAuth2 governs resource access; it is silent on how an RP maintains "this browser is user X" afterwards. OIDC says: validate the `id_token` once at login, then it has served its purpose. Auth.js / NextAuth / Passport / Spring Security all behave this way.

Specific reasons we don't forward the IDP's tokens:
- `access_token` is opaque in many IDPs — not a JWT, not meant to be parsed by the RP. Using it for identity is an anti-pattern (one of the most-cited mistakes in early "OAuth-as-login" deployments).
- `id_token` is always a JWT (OIDC requirement) but typically short-lived (5–10 min). It would expire mid-form. Validating its signature on each submission also requires a JWKS fetch with cache invalidation on IDP key rotation — extra failure modes for no benefit.
- We want to merge claims from `userinfo`, which are not in the `id_token`.
- We don't need cross-instance validity. Only the n8n instance that issued it ever validates it. HS256 with the instance encryption key is the right shape.

This does **not** weaken OAuth2/OIDC security. The IDP authenticated the user; we recorded that fact in a signed envelope; the envelope is then used purely as the RP's session.

### 4.6 Where this hooks into existing code

| Existing location | Change |
|---|---|
| [`FormTriggerV2.node.ts`](../v2/FormTriggerV2.node.ts) — `properties.authentication` options | Add `{ name: 'OAuth2 / OIDC Login', value: 'oauthLogin' }`. Add credential block gated by `displayOptions.show.authentication = ['oauthLogin']` referencing `oAuth2Api`. Add new properties: `userInfoUrl`, `userOutputField`, `showLoggedInBanner`. |
| [`Webhook/utils.ts`](../../Webhook/utils.ts) — `validateWebhookAuthentication` | Add `oauthLogin` branch. Export new `WebhookOauthAuthorizationError` class. See §4.3. |
| [`packages/workflow/src/interfaces.ts`](../../../../workflow/src/interfaces.ts) — `IWebhookFunctions.helpers` | Declare new method `getWebhookOauthRedirectUrl(opts)`. |
| [`packages/core/`](../../../../core/src) — webhook function context implementation | Implement `getWebhookOauthRedirectUrl`. Uses `CredentialsHelper` + `InstanceSettings`. |
| [`interfaces.ts`](../interfaces.ts) | Extend `FormTriggerData` with `loggedInBanner?: { displayName: string; email?: string; logoutUrl: string }`, `userClaimsSigned?: string` (the session JWT to embed in the hidden field), `canonicalFormUrl?: string` (for `replaceState`). |
| [`utils/utils.ts`](../utils/utils.ts) — `formWebhook` | New catch arm for `WebhookOauthAuthorizationError` (method-based 302/401). New dispatch on POST body content: `__form_auth_init` → render form; otherwise → submission. **No `getCredentials()` calls.** |
| `utils/utils.ts` — `renderForm` | Accept claims, populate `loggedInBanner`, embed `userClaimsSigned` as hidden field, embed `canonicalFormUrl` for the `replaceState` script. |
| `utils/utils.ts` — `prepareFormReturnItem` | Read hidden `form_auth` field (already verified by `validateWebhookAuthentication`), attach claims under `userOutputField` on the returned item. |
| [`form-trigger.handlebars`](../../../../cli/templates/form-trigger.handlebars) | Add optional banner section above the form. Add hidden `<input name="form_auth">`. Add `<script>history.replaceState(null, '', '<canonicalFormUrl>')</script>` when present. |
| New template `form-trigger-auth-error.handlebars` | Neutral auth-error page rendered by the callback controller. |
| New controller `form-oauth.controller.ts` | Implements `/form-oauth/callback` per §4.2. Uses DI'd `CredentialsHelper`, `WorkflowRepository`, instance encryption key. |
| [`waiting-forms.ts`](../../../../cli/src/webhooks/waiting-forms.ts) / [`waiting-webhooks.ts`](../../../../cli/src/webhooks/waiting-webhooks.ts) | **No changes.** Waiting form pages remain gated by the existing `resumeToken`. See §4.10. |

### 4.7 The two JWTs

Two short-lived signed envelopes — neither is persisted server-side.

**State JWT** (lives in the OAuth `state` parameter, round-trips via the IDP):

```jsonc
{
  "iss": "n8n-form-oauth",
  "exp": <now + 10 min>,
  "nonce": "<random 16 bytes>",
  "wf":   "<workflowId>",
  "node": "<nodeId>"
}
```

Purpose: lets the callback controller know which workflow/node/credential to operate on, and provides CSRF protection on the callback. Signed and verified with the form-OAuth signing key (§4.8).

**Session JWT** (lives in the form HTML as a hidden field — and only there):

```jsonc
{
  "iss": "n8n-form-oauth",
  "exp": <now + sessionLifetimeSec>,   // default 1 hour, no explicit config in v1
  "wf":   "<workflowId>",
  "node": "<nodeId>",
  "claims": { /* merged id_token + userinfo claims, minus housekeeping */ }
}
```

Purpose: carries the authenticated identity from the callback through to the form submission. Signed with the same key as the state JWT.

**Where the session JWT lives at each step**:

| Step | Location |
|---|---|
| After callback exchanges code | Response body — inside an HTML `<input type="hidden">` of a self-submitting `<form>` |
| Bootstrap POST in flight | Request body (POST form-encoded `__form_auth_init` field) |
| After form renders | Inside the rendered form's hidden `<input name="form_auth">` |
| Submission in flight | Request body (POST form-encoded `form_auth` field) |
| Server-side | Verified, decoded, then dropped after attaching claims to the workflow return item |

It is never in a URL, never in a cookie, never in the DB.

### 4.8 Signing key

Reuse n8n's instance-wide encryption key (`InstanceSettings.encryptionKey`) as the HMAC secret for both JWTs (HS256). Rationale:

- Already deterministic per instance, already protected with the same operational care as other secrets.
- No new key-management surface for v1.
- Acceptable since the JWTs never leave the same n8n instance that issued them (the state JWT round-trips through the IDP as opaque text, but is only ever verified on the same instance).

A future iteration may switch to a dedicated key if/when we expose forms across instances or behind a CDN that strips redirects.

### 4.9 What is — and isn't — stored

| Item | Stored? | Where |
|---|---|---|
| Credential `clientId`, `clientSecret`, endpoints, scope | Yes (already) | Credentials table, encrypted |
| Visitor's `access_token`, `refresh_token`, `id_token` | **No** | Held only in the callback's request scope, dropped before responding |
| Visitor's merged claims (in the session JWT) | **No** server-side persistence | Only in the signed session JWT, which transits via HTML body / form POST body — not URL, not cookie, not DB |
| Visitor's merged claims (in the workflow output) | Yes — only if builder configured `userOutputField` | Workflow execution data, same storage as any trigger output (i.e., subject to normal execution retention) |
| State / nonce | **No** | In the signed state JWT only |
| Auth session | **No** | None — page reload re-runs the OAuth flow |

The "trigger output is persisted to executions" behaviour is unchanged from today; that is the explicit, opt-in surface for the claims (controlled by `userOutputField`).

### 4.10 Multi-page forms and waiting forms

Multi-page n8n forms run through wait/resume: after the trigger submission, the workflow reaches a `Form` (page) node, which calls [`putExecutionToWait`](../Form.node.ts#L447) and returns a 307 to `$execution.resumeFormUrl` (shape: `/form/<executionId>?signature=<resumeToken>`). The visitor follows the redirect; [`WaitingForms.executeWebhook`](../../../../cli/src/webhooks/waiting-forms.ts#L58) validates the `resumeToken` and routes to [`Form.webhook`](../Form.node.ts#L354), which renders the page via [`renderFormNode`](../utils/formNodeUtils.ts#L13).

Two facts about this flow today:
- **FormTrigger's basic-auth is not propagated** to waiting Form pages. [`Form.webhook`](../Form.node.ts#L354) does not call `validateWebhookAuthentication`. The `resumeToken` (single-use, opaque random value, validated via `timingSafeEqual` in [`validateToken`](../../../../cli/src/webhooks/waiting-webhooks.ts#L132)) is the sole access gate.
- This is intentional: the resumeToken acts as a one-time bearer credential implicitly issued to whoever initiated the form. A different visitor wouldn't have it.

**For OIDC, we adopt the same model deliberately.** Identity is captured **once, at the trigger**. Waiting form pages do not re-run the OAuth flow, do not validate a session JWT, and require no changes to the waiting-webhook code path.

The Form Trigger captures claims and emits them into the trigger output under `userOutputField` (default `user`). This output is part of the workflow run data — accessible to every downstream node via the standard expression engine at workflow execution time, e.g., for use in node parameters, conditional logic, or downstream API calls.

One subtle implication worth surfacing to builders: if a workflow's `resumeFormUrl` is forwarded to a different person between trigger and waiting page, any identity reference in downstream nodes still reflects the trigger-time authenticated user, not the page-time visitor. That matches the data semantics (the trigger fired with that identity) and mirrors the existing behaviour of `submittedAt` and other trigger-captured fields. If a future use case needs per-page identity, that's an additive feature (e.g., a "re-authenticate at this page" option on the Form node) and out of scope for v1.

### 4.11 Token exchange and userinfo as HTTP requests

Token exchange (`POST <accessTokenUrl>`) and userinfo fetch (`GET <userInfoUrl>`) run server-to-server from the new controller to the IDP. They are **not** retried or cached. Failure renders the auth-error template. Both use the standard HTTP helpers, scoped to the controller — they do not pass through any node-execution machinery.

## 5. UX details

### 5.1 First visit (happy path)

1. GET form URL → `validateWebhookAuthentication` throws `WebhookOauthAuthorizationError` → 302 to IDP.
2. IDP login → 302 to `/form-oauth/callback`.
3. Callback exchanges code, fetches userinfo, drops IDP tokens → responds 200 with self-submitting `<form>` containing the session JWT.
4. Browser auto-POSTs to the form webhook URL → form renders with banner + `history.replaceState` to canonical URL.

### 5.2 Already-logged-in at IDP

IDP returns immediately without showing its login screen. Visitor experience: brief redirect dance, then the form. Same as Google Forms with SSO.

### 5.3 Reload

Reloading the canonical form URL triggers a GET with no session JWT (it was only in HTML; the reload drops it). That starts §5.1 step 1 again. With SSO at the IDP this is invisible.

### 5.4 Submission

POST carries the hidden `form_auth`. `validateWebhookAuthentication` verifies it, claims are attached to the return item under `userOutputField`, the workflow runs. If verification fails (expired session, tampered JWT) on a POST, the response is 401 — the form client should treat that as "reload to re-auth".

### 5.5 Logout

The "Log out" link points to the form URL with `?reauth=1`. The form webhook's GET handler propagates this — when `validateWebhookAuthentication` calls `getWebhookOauthRedirectUrl({ reauth: true })`, the helper appends `prompt=login` to the IDP authorize URL.

Result: even if the IDP has an SSO cookie, the user is re-prompted. We do **not** call the IDP's `end_session_endpoint` (RP-Initiated Logout, out of scope for v1).

### 5.6 Errors

| Failure | Visitor sees |
|---|---|
| IDP returned `error=access_denied` | "You did not grant access. [Try again](form-url)." |
| Token exchange failed | "Sign-in failed. [Try again](form-url)." |
| Session JWT expired during multi-page flow | "Your sign-in expired. [Start over](trigger-url)." |
| State JWT tampering | Same as expired (do not reveal tampering specifically). |

All four use the same `form-trigger-auth-error.handlebars` template with different copy.

## 6. Security considerations

- **State JWT** carries `nonce` + `exp` and is HMAC-signed → covers CSRF on the callback and prevents IDP-side replay outside the 10-minute window.
- **Session JWT** is HMAC-signed → tampered claims fail verification before they hit the workflow. The form cannot be tricked into outputting claims the IDP did not issue.
- **No token in URL**: the session JWT only ever appears in HTML or POST bodies. Browser history, referrer headers, server access logs, and bookmarks therefore never carry a replayable identity token. The callback URL's `code` / `state` query params do hit history, but both are single-use.
- **No DB writes** of access / refresh / ID tokens → no new attack surface in the credentials store; compromise of the encryption key still does not yield visitor tokens (they don't exist server-side).
- **Credential isolation**: the node never decrypts the credential. A bug in node-rendering code cannot leak the client secret.
- **`prompt=login` on reauth** prevents the "I clicked log out but came back as the same user" footgun, within the limits of not doing RP-Initiated Logout.
- **Client secret** stays server-side, in the controller, fetched fresh per request via `CredentialsHelper`.
- **No open redirect**: the state JWT does not carry a free-form `returnTo`. The canonical form URL is re-derived from `wf` / `node` inside the callback and the form webhook, not trusted from URL claims.
- **Sandbox CSP on all rendered HTML**: every HTML response in this flow — the callback's bootstrap, the auth-error template, and the form itself — sets the same `getHtmlSandboxCSP()` header that today's form pages use. The sandbox isolates the rendered page into a unique opaque origin, preventing any embedded HTML (e.g., user-supplied content in form description / HTML fields) from reaching n8n's auth cookies or any other origin's state. Gated by the same `isFormHtmlSandboxingDisabled()` kill-switch as existing form rendering, so admins keep a single toggle.
- **Bot / crawler ignore**: the existing `ignoreBots` option still applies — bots get a 200 with no form, before any redirect to the IDP.
- **Test executions** of the trigger should still produce a usable test URL; that URL goes through the same OAuth flow. Test executions are noted as out of scope refinement for now.

## 7. Configuration surface (final summary)

New / extended Form Trigger node parameters (under `Authentication = OAuth2 / OIDC Login`):

| Name | Type | Default | Required |
|---|---|---|---|
| `oauthLoginCredential` | credential (oAuth2Api) | — | yes |
| `userInfoUrl` | string | `''` | no |
| `userOutputField` | string | `user` | no — empty disables |
| `showLoggedInBanner` | boolean | `true` | no |

No new options on the multi-page `Form` (page) node — pages inherit identity from the trigger via workflow data.

## 8. Out of scope (named, so we know what we're not doing)

> **Implementation agents: anything in this section is explicitly excluded from the initial implementation. Do not pull these in opportunistically.**

- **`{{ $user.* }}` render-time template substitution** in form title, description, HTML blocks, or field defaults. Requires expression-engine integration and typed UI autocomplete — significant additional scope.
- OIDC RP-Initiated Logout (`end_session_endpoint`).
- Per-form session lifetime configuration (fixed 1 hour for v1).
- Token refresh / passing access tokens to downstream nodes for API calls.
- SSO across multiple forms in the same workflow / instance.
- Claims whitelist UI — v1 emits the full merged claim object minus standard JWT housekeeping.
- Group / role gating ("only let users with `groups: ['hr']` in").
- Multi-tenancy concerns (per-tenant client credentials).
- SAML.
- Storing the access token for the workflow to call IDP-protected APIs.
- Per-page re-authentication on waiting form pages.
- JSON-API form mode (return form schema + 401-with-redirect-url for programmatic clients).

## 9. Open questions

1. Should `userInfoUrl` live on the credential (extension of `oAuth2Api`) instead of on the node? On the node is friendlier when one OAuth2 credential is reused across many forms with different needs; on the credential is friendlier when one IDP is reused across many forms. Spec assumes the node. Worth raising in the implementation plan.
2. Does any existing form analytics / observability path log query strings or POST bodies? If yes, `__form_auth_init` (POST body during bootstrap) and `form_auth` (POST body during submission) must be redacted before logging.
3. How does this interact with the `responseMode = responseNode` flow when the responding node wants to redirect? The session JWT in the form's hidden field is consumed before any responseNode runs, so this should be a non-issue, but confirm during implementation.
4. The bootstrap step needs JavaScript. The `<noscript>` fallback currently just says "JavaScript is required". Is that acceptable, or do we want a manual "Continue" button fallback?

## 10. Considered alternatives

This section captures the design decisions that had real alternatives, so future readers (and reviewers of this spec) can see *why* we landed where we did rather than just *what* we chose.

### 10.1 Credential type — reuse `oAuth2Api` vs. new `oidcLogin` type

**Chose**: reuse the existing generic `oAuth2Api` credential.

**Alternative**: a dedicated `oidcLogin` credential type holding only client config (no stored token), since the access token that `oAuth2Api` stores after the credential-owner's authorization is irrelevant to our flow.

**Why rejected**: more new code for marginal semantic gain. The unused stored token is simply ignored; the fields we actually need (`clientId`, `clientSecret`, `authUrl`, `accessTokenUrl`, `scope`) are already on `oAuth2Api`. The same credential can also serve regular API-access use cases — useful when an IDP is both "the login provider" and "an API we call".

### 10.2 Session JWT in URL vs. HTML hidden field

**Chose**: HTML hidden field only.

**Alternative**: 302 from the callback to the form URL with `?form_auth=<session JWT>` query param (the original v1 of this spec).

**Why rejected**: URLs leak through browser history (replayable until JWT exp), browser sync to other devices, referrer headers, server access logs, screenshots, screen-shares, and bookmarks. The token would be replayable from any device the user later browses on. The cost of preventing this is small (a self-submitting POST page + `history.replaceState`), the cost of leaking it is unbounded.

### 10.3 Session storage — cookie vs. hidden field

**Chose**: HTML hidden field, no cookie.

**Alternative**: a `__Host-` cookie scoped to the form path, HttpOnly + SameSite=Strict.

**Why rejected**: explicit product requirement that forms don't use cookies. Side effect that aligns with the model: page reload drops the session and re-runs the OAuth flow — which is the wanted behaviour ("no DB storage, reload = reauth"). With SSO at the IDP this is invisible to the user.

### 10.4 Identity token — forward IDP's tokens vs. mint internal session JWT

**Chose**: mint our own HMAC-signed session JWT.

**Alternative**: forward the IDP's `id_token` (signed JWT with claims) as the session token; validate against IDP's JWKS on each submission.

**Why rejected**:
- `id_tokens` are typically short-lived (5–10 min) and would expire mid-form.
- `access_tokens` are opaque in many IDPs — not parseable for identity (well-documented anti-pattern from early "OAuth-as-login" deployments).
- JWKS fetch + key-rotation handling adds external dependencies and failure modes for no benefit.
- We want to merge `userinfo` claims, which aren't in the `id_token`.
- The internal-session-token pattern is the standard relying-party pattern (Auth.js / NextAuth / Passport / Spring Security all behave this way).

### 10.5 Redirect-URL builder — separate `/form-oauth/start` controller vs. helper on `IWebhookFunctions`

**Chose**: helper on `IWebhookFunctions` (`getWebhookOauthRedirectUrl`), called from inside `validateWebhookAuthentication`.

**Alternative**: a dedicated `GET /form-oauth/start` controller that the form webhook 302s to, which then 302s to the IDP. This kept *all* credential access in controllers.

**Why rejected**: extra hop in the redirect chain for no architectural benefit. The helper achieves the same "no credential access in node code" guarantee (the implementation lives in `packages/core`), reuses the existing `validateWebhookAuthentication` error-throwing pattern, and is reusable for any future webhook node that wants OAuth login (e.g., Chat trigger).

### 10.6 Response on missing auth — method-based vs. content-negotiated

**Chose**: method-based (`GET` → 302, `POST` without auth → 401).

**Alternative**: distinguish callers by `Accept` header — `text/html` → 302, else → 401.

**Why rejected**: easy-to-forget rule with subtle failure modes. Method-based is deterministic, covers every current path cleanly, and leaves space for the future JSON-API form mode to layer on the 401 by returning the redirect URL in a JSON body — without changing this behaviour for existing form clients.

### 10.7 Waiting form auth — re-auth per page vs. identity captured once

**Chose**: identity captured once, at the trigger. Waiting pages gated by the existing `resumeToken`.

**Alternative**: re-run the OAuth flow at every Form (page) node.

**Why rejected**: a different user might be at the IDP by the time a page resumes (SSO context changed, different browser, etc.), which would either fail or silently switch identities mid-workflow. The trigger-time identity is what the workflow logically operates on — same as `submittedAt` and any trigger-captured fields. The `resumeToken` (single-use, ~256-bit random, validated `timingSafeEqual`) is already a strong access gate and matches today's basic-auth-not-propagated behaviour. Bonus: zero changes to `waiting-forms.ts` / `waiting-webhooks.ts`.

### 10.8 Claims emitted — full set vs. whitelist

**Chose**: full merged claims (ID token + userinfo), minus JWT housekeeping (`iat`, `nbf`, `at_hash`, `c_hash`, `nonce`, `jti`).

**Alternative**: whitelist of standard OIDC claims (`sub`, `name`, `email`, `picture`, `locale`, `preferred_username`, `groups`).

**Why rejected**: builders already control what gets released — via the OAuth2 credential's `scope` and the IDP's claim-release configuration. Adding a second filtering layer in n8n would block legitimate custom claims (`tenant_id`, `roles`, etc.) that builders deliberately requested. Easy to add a builder-controlled whitelist as a follow-up if real cases emerge.

### 10.9 Signing key — dedicated vs. reuse instance encryption key

**Chose**: reuse `InstanceSettings.encryptionKey` (HS256).

**Alternative**: a new dedicated key with its own management surface (rotation, env-var, etc.).

**Why rejected**: no new key-management surface for v1. The JWTs never leave the issuing instance (state JWT round-trips through the IDP as opaque text but is only ever verified back at the same n8n). Acceptable for the current threat model. Easy to swap to a dedicated key later if we expose forms across instances or behind a CDN that strips redirects.

### 10.10 Render-time `{{ $user.* }}` in form copy — included vs. deferred

**Chose**: deferred (explicitly future scope, see §2 callout).

**Alternative**: add `$user` to the expression scope of `renderForm` / `renderFormNode` so builders can write `Hi {{ $user.given_name }}` in titles, descriptions, HTML blocks, and field defaults.

**Why deferred**: doing it well requires expression-engine integration *and* typed UI autocomplete in the editor — non-trivial scope on top of the auth work. The session JWT will carry the claims and the trigger output exposes them under `userOutputField`, so a follow-up can add render-time interpolation without breaking changes.

### 10.11 Logout — local-only vs. RP-Initiated Logout

**Chose**: local-only logout, with `prompt=login` on the next authorize request.

**Alternative**: RP-Initiated Logout — redirect to the IDP's `end_session_endpoint` so the user is signed out at the IDP too.

**Why rejected for v1**: requires discovering and configuring `end_session_endpoint` (not in the `oAuth2Api` credential today), handling `id_token_hint` (we drop the `id_token`), and dealing with IDPs that don't support it gracefully. `prompt=login` covers the realistic UX need ("let me sign in as someone else") without any of that surface. Can be added as an opt-in later.
