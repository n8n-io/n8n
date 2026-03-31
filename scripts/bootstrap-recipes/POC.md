# OEM Bootstrap POC — Decision Log

**Branch:** `ireneea/sap-oem-go-live`
**Status:** Phase 4 complete (owner + OIDC + SAML + API key bootstrap)

---

## What this POC is

OEM partners (e.g. SAP) need to deploy a fully-configured n8n instance with no UI
wizard and no manual post-deploy steps — everything driven by environment variables
and mounted files. This POC builds that foundation incrementally.

Phases planned:

```
Phase 1 — N8N_INIT_* infrastructure                     ✅ done  ┐ same Linear ticket
Phase 2 — Owner bootstrap (N8N_INIT_OWNER_*)            ✅ done  ┘
Phase 3 — SSO provider seeding (OIDC / SAML)            ✅ done
Phase 4 — API key bootstrap                              ✅ done
Phase 5 — Bootstrap-aware readiness probe               planned
```

> **Ticketing note:** Phases 1 and 2 should be a single Linear ticket. Phase 1 alone
> produces no observable behaviour — the owner step is what makes the infrastructure
> testable and shippable. The two phases fit naturally in one PR.

---

## Phases 1 & 2 — What was built

### New files

| File | Purpose |
|---|---|
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Declares all `N8N_INIT_*` env vars using `@Config` / `@Env()` |
| `packages/cli/src/bootstrap/bootstrap.service.ts` | Orchestrator — runs steps in order on startup |
| `packages/cli/src/bootstrap/steps/owner.bootstrap-step.ts` | Owner seeding step |
| `scripts/bootstrap-recipes/owner-setup.sh` | Local dev recipe to test the flow |
| `scripts/bootstrap-recipes/bootstrap-secrets/` | Gitignored folder for local secret files |

### Modified files

| File | Change |
|---|---|
| `packages/@n8n/config/src/index.ts` | Exports `BootstrapConfig` |
| `packages/cli/src/commands/start.ts` | Calls `initBootstrap()` after `AuthRolesService.init()`, main instance only |

### Startup insertion point

Bootstrap runs inside `start.ts → init()`, between these two existing calls:

```
AuthRolesService.init()   ← roles + scopes synced, needed for owner role assignment
initBootstrap()           ← NEW: seeds owner (and future: SSO, API key)
WaitTracker.init()        ← HTTP server not yet started
```

This window matters: DB is migrated, license is active, auth roles exist, but no
traffic is being served yet. Bootstrap must complete before the server starts.

---

## Key decisions

### `BootstrapConfig` is standalone, not nested in `GlobalConfig`

The `@Config` decorator registers any class with the DI container directly via
`@Service({ factory })`. `BootstrapConfig` does not need to be a `@Nested` field
on `GlobalConfig` — it can be injected into `OwnerBootstrapStep` directly.

Reason: bootstrap config is not part of the general runtime config surface; keeping
it separate makes the intent clear and avoids polluting `GlobalConfig`.

### `_FILE` suffix comes for free

The existing `readEnv()` in `packages/@n8n/config/src/decorators.ts` already checks
`${VAR}_FILE` for every `@Env()` declaration. Declaring `@Env('N8N_INIT_OWNER_PASSWORD')`
automatically enables `N8N_INIT_OWNER_PASSWORD_FILE` with no extra code.

This means production deployments should use the `_FILE` variant (Docker secrets,
vault-injected files) and development can use the plain var. Document this clearly
when shipping to OEM partners.

### `OwnershipService.setupOwner()` is reused as-is

`setupOwner()` already handles: password hashing, shell-user lookup, settings
persistence (`isInstanceOwnerSetUp = true`), and event emission. We call it directly
rather than duplicating its logic.

Trade-off: it also calls `hasInstanceOwner()` internally and throws `BadRequestError`
if an owner exists. Our step checks the settings key first to avoid hitting that path
in the normal boot case, but catches `BadRequestError` anyway to handle the multi-main
race edge case.

### Idempotency is DB-based, not leader-election-based

Bootstrap does not wait for leader election. In multi-main mode, leader election is
async, Redis-dependent, and resolves after the HTTP server starts — too late. Instead,
each step reads the DB to decide whether to act. Two instances racing on a fresh DB
are handled by catching the `BadRequestError` that the second caller receives from
`setupOwner()`.

For future steps (SSO, API key), the same pattern applies: check a settings key or
unique constraint before inserting, catch the conflict error if another instance won.

### `initBootstrap()` uses lazy `await import()`

Consistent with the pattern used for other optional services in `start.ts`
(e.g. `PrometheusMetricsService`). Keeps the startup critical path lean and avoids
loading bootstrap code on worker instances.

---

## Things to revisit before production

### `isInstanceOwnerSetUp` settings key is marked for deletion

`setupOwner()` contains a `#region Delete me` comment (line ~249 in
`ownership.service.ts`). The settings key `userManagement.isInstanceOwnerSetUp` is
considered a temporary persistence mechanism. Our idempotency check reads this key.

Before shipping, align with the team on whether this key will remain or be replaced
(e.g. by checking `hasInstanceOwner()` directly). If it's removed, replace the
settings check with a direct DB query via `hasInstanceOwner()`.

### `N8N_INIT_OWNER_PASSWORD_HASH` variant was not implemented

The PLAN.md notes that a pre-hashed bcrypt variant (`N8N_INIT_OWNER_PASSWORD_HASH`)
should be accepted to match Cloud hooks patterns. The POC only implements the
plaintext variant (hashed at startup by `passwordUtility.hash()`). The hash variant
should be added before this ships to OEM partners.

### Unit tests are not in this branch

`OwnerBootstrapStep` needs unit tests covering:
- `ownerEmail` not set → `'skipped'`
- settings key is `true` → `'skipped'`
- settings key is `false` / absent → calls `setupOwner()` → `'created'`
- `setupOwner()` throws `BadRequestError` (race) → `'skipped'`
- `setupOwner()` throws any other error → rethrows

### `bootstrap-secrets/` owner_password placeholder

The local dev recipe seeds a default placeholder password via `seed-secrets.sh`. For
real OEM delivery this file won't exist — the operator provides it via a Docker secret
or secrets manager. The recipe is dev-only infrastructure.

---

## How to test locally

```bash
# 1. Remove existing n8n data to get a fresh DB
rm -rf ~/.n8n

# 2. Build
pnpm build > build.log 2>&1

# 3. Run the recipe
bash scripts/bootstrap-recipes/owner-setup.sh

# Expected: n8n starts, owner is created, login page shown (no wizard)
# Restart the same command — owner step logs "skipped", no error
```


---

## Phase 3 — What was built

### New files

| File | Purpose |
|---|---|
| `packages/cli/src/bootstrap/steps/oidc.bootstrap-step.ts` | OIDC seeding step |
| `packages/cli/src/bootstrap/steps/saml.bootstrap-step.ts` | SAML seeding step |
| `scripts/bootstrap-recipes/oidc-setup.sh` | Local dev recipe for OIDC |
| `scripts/bootstrap-recipes/saml-setup.sh` | Local dev recipe for SAML |

### Modified files

| File | Change |
|---|---|
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Added `ssoOidcConfigFile` / `ssoSamlConfigFile` env vars |
| `packages/cli/src/bootstrap/bootstrap.service.ts` | Wired in `OidcBootstrapStep` and `SamlBootstrapStep` |

### How it works

Each step reads a JSON file at the path given by the env var, validates it, and writes
directly to `SettingsRepository` under the same key the SSO services use at runtime
(`features.oidc` / `features.saml`). Secrets (`clientSecret` for OIDC,
`signingPrivateKey` for SAML) are encrypted with `Cipher` before storage, matching
what the live service methods do.

**Why direct DB write instead of calling the service methods:**
Both `OidcService.updateConfig()` and `SamlService.setSamlPreferences()` make live
network requests at call time (OIDC fetches the discovery endpoint; SAML fetches
metadata from `metadataUrl`). Calling these at bootstrap would fail if the IdP is
temporarily unreachable. Direct DB write avoids this — the services pick up the config
from DB on first use.

**Idempotency:** each step checks whether the settings key already exists and returns
`'skipped'` if so. All failure modes (file missing, bad JSON, invalid shape) log a
warning and return `'skipped'` — startup never crashes.

---

## Key decisions (Phase 3)

### `loginEnabled` defaults to whatever the operator sets

Unlike the UI flow, there is no forced `loginEnabled: false` — the operator controls
this in their JSON file. For testing with mocksaml.com, set `"loginEnabled": true`.
For production, operators may prefer `false` and enable via the UI after verifying IdP
connectivity.

### `authnRequestsSigned` is not usable yet

Signed SAML AuthnRequests are behind `N8N_ENV_FEAT_SIGNED_SAML_REQUESTS=true` and
are not fully wired through to samlify (the private key is not passed to the
`ServiceProvider` instance). Setting `"authnRequestsSigned": true` in the config will
cause a runtime error when the login flow starts.

**Workaround for mocksaml.com:** mocksaml's metadata declares
`WantAuthnRequestsSigned="true"` but samlify enforces that the SP setting must match —
set it to `"false"` in the inline metadata string AND in the config. mocksaml does not
enforce this server-side and will accept unsigned requests.

### SAML attribute mapping must match what the IdP actually sends

The `mapping` object values are attribute name keys looked up in
`flowResult.extract.attributes`. They must exactly match the attribute names in the
SAML assertion — not the logical names used in the mapping object itself.

mocksaml.com sends: `email`, `firstName`, `lastName` (plain names, no namespace prefix).

---

## How to test SAML locally (mocksaml.com)

### Prerequisites
- n8n enterprise license env vars set in `saml-setup.sh` (`N8N_LICENSE_TENANT_ID`,
  `N8N_LICENSE_ACTIVATION_KEY`)
- `bootstrap-secrets/saml-config.json` populated (see below)

### Step 1 — Get the IdP metadata from mocksaml.com

1. Go to **https://mocksaml.com**
2. In the SP metadata URL field enter: `http://localhost:5678/rest/sso/saml/metadata`
   (n8n must be running, or you can start it first and then fetch)
3. Download the IdP metadata XML

### Step 2 — Build `bootstrap-secrets/saml-config.json`

```json
{
  "metadata": "<paste IdP metadata XML here as a JSON-escaped single-line string>",
  "loginEnabled": true,
  "loginLabel": "SSO (mocksaml)",
  "loginBinding": "redirect",
  "acsBinding": "post",
  "authnRequestsSigned": false,
  "wantAssertionsSigned": true,
  "wantMessageSigned": true,
  "mapping": {
    "email": "email",
    "firstName": "firstName",
    "lastName": "lastName",
    "userPrincipalName": "email"
  }
}
```

**Important:** in the inline `metadata` string, change `WantAuthnRequestsSigned="true"`
to `WantAuthnRequestsSigned="false"` — otherwise samlify will throw
`ERR_METADATA_CONFLICT_REQUEST_SIGNED_FLAG` because the SP has `authnRequestsSigned: false`.

### Step 3 — Run

```bash
rm -rf ~/.n8n
bash scripts/bootstrap-recipes/saml-setup.sh
```

Expected startup log: `Bootstrap step "sso-saml": created`

### Step 4 — Log in

1. Go to `http://localhost:5678/signin`
2. Click **SSO (mocksaml)**
3. You are redirected to mocksaml.com — enter any username, domain `@example.com`,
   any password
4. You are redirected back to n8n's ACS endpoint and logged in

### Second boot (idempotency check)

Restart without deleting `~/.n8n`. Expected log: `Bootstrap step "sso-saml": skipped`.
The DB record is unchanged.

### Errors encountered during testing

| Error | Cause | Fix |
|---|---|---|
| `This is not private key` | `authnRequestsSigned: true` but no key wired to samlify | Set `authnRequestsSigned: false` |
| `ERR_METADATA_CONFLICT_REQUEST_SIGNED_FLAG` | IdP metadata says `WantAuthnRequestsSigned="true"` but SP has `authnRequestsSigned: false` | Change the flag to `false` in the inline metadata string |
| `missing attributes: user.email, user.firstName…` | Mapping values used `user.` prefix but mocksaml sends plain names | Change mapping to `"email": "email"`, `"firstName": "firstName"`, etc. |

---

## Things to revisit before production (Phase 3)

### Signed SAML requests need to be completed

`getServiceProviderInstance()` in `service-provider.ee.ts` does not pass
`signingPrivateKey` to samlify. Before enabling `authnRequestsSigned` end-to-end,
the decrypted key from `getDecryptedSigningPrivateKey()` needs to be wired into the
SP constructor. Tracked separately.

### SAML has no Zod validation at seed time

Unlike OIDC (which uses `OidcConfigDto.safeParse()`), the SAML step accepts any JSON
that parses — there is no schema validation. Invalid fields will surface at first login
attempt, not at bootstrap. A Zod schema for `SamlPreferences` would improve the
operator experience.

### Unit tests are not in this branch

Both `OidcBootstrapStep` and `SamlBootstrapStep` need unit tests covering the same
scenarios as `OwnerBootstrapStep`: env var absent, key already exists, file missing,
bad JSON, invalid shape, happy path.

### Notes for OEM operators

- `signingPrivateKey` / `signingCertificate` are optional. Only needed if the IdP
  requires signed AuthnRequests (`WantAuthnRequestsSigned="true"`) — and only once
  the feature is fully wired up.
- Use `"loginEnabled": false` initially and enable via the UI after verifying IdP
  connectivity in production.
- check with James & Andi about users from SSO

---

## How to test OIDC locally (Keycloak in Docker)

Uses the same Keycloak image and realm config as the E2E test suite
(`keycloak/keycloak:26.4`). Everything is handled by `oidc-setup.sh` —
no manual Docker commands needed.

### Prerequisites

- Docker Desktop running
- Enterprise license env vars set in `oidc-setup.sh` (`N8N_LICENSE_TENANT_ID`,
  `N8N_LICENSE_ACTIVATION_KEY`)

### Step 1 — Run the recipe

```bash
bash scripts/bootstrap-recipes/oidc-setup.sh
```

The script will:
1. Start a Keycloak container (`n8n-keycloak-local`) with a pre-configured realm
2. Generate a self-signed TLS cert inside the container and extract it to
   `bootstrap-secrets/keycloak-ca.pem`
3. Write `bootstrap-secrets/oidc-config.json` pointing at
   `https://localhost:8443/realms/test/.well-known/openid-configuration`
4. Start n8n with `NODE_EXTRA_CA_CERTS` set so Node.js trusts the self-signed cert

Expected startup log: `Bootstrap step "sso-oidc": created`

### Step 2 — Log in

1. Go to `http://localhost:5678/signin`
2. Click **Continue with SSO** (or the OIDC button)
3. You are redirected to Keycloak — log in with the test user credentials
   from `seed-secrets.sh` (email: `test@n8n.io`)
4. You are redirected back to n8n and logged in

### Second boot (idempotency check)

Restart without deleting `~/.n8n`. Expected log: `Bootstrap step "sso-oidc": skipped`.

### Resetting Keycloak between runs

```bash
docker rm -f n8n-keycloak-local
rm scripts/bootstrap-recipes/bootstrap-secrets/keycloak-ca.pem
rm scripts/bootstrap-recipes/bootstrap-secrets/oidc-config.json
```

### macOS gotcha: `timeout` command not found

macOS does not ship with GNU `timeout`. The script uses a bash-native deadline
loop instead — no Homebrew install required.

---

## Phase 4 — What was built

### New files

| File | Purpose |
|---|---|
| `packages/cli/src/bootstrap/steps/api-key.bootstrap-step.ts` | API key seeding step |
| `scripts/bootstrap-recipes/api-key-setup.sh` | Local dev recipe for API key bootstrap |

### Modified files

| File | Change |
|---|---|
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Added `apiKeyLabel`, `apiKeyScopes`, `apiKeyOutputFile` env vars |
| `packages/cli/src/bootstrap/bootstrap.service.ts` | Wired in `ApiKeyBootstrapStep` after the SAML step |
| `packages/cli/src/bootstrap/steps/saml.bootstrap-step.ts` | Removed leftover `console.log` debug statement |

### How it works

The step generates a public API key for the instance owner using
`PublicApiKeyService.createPublicApiKeyForUser()` — the same service method used
by the UI. The resulting JWT is:
- Logged at `info` level so it appears in log streams (Datadog, CloudWatch, etc.)
- Written to `N8N_INIT_API_KEY_OUTPUT_FILE` with mode `0o600` if the path is set

The key is always created for the instance owner (the only user who exists at
bootstrap time). It has no expiration by default.

**Step order matters:** `api-key` runs last, after `owner`, because the JWT payload
requires the owner's `userId` as the `sub` claim.

**Output file recovery:** if the container is restarted with the output file missing
(e.g. ephemeral volume), the step detects the existing DB record on the idempotency
check and re-writes the file from the stored JWT.

---

## Key decisions (Phase 4)

### Why n8n generates the key rather than the operator providing one

API keys are JWTs signed with a secret derived from the instance encryption key.
The JWT `sub` claim is the owner's `userId`, which is a `nanoId` assigned at
creation time — not predictable before first boot. The operator therefore cannot
pre-generate a valid key externally, even if they know the encryption key.

### Why `N8N_INIT_API_KEY_LABEL` is the activation guard and idempotency key

The `user_api_keys` table has a `@Unique(['userId', 'label'])` constraint. Using the
label as both the trigger and the idempotency key means: if the label is absent the
step is a no-op, and if a key with that label already exists the step skips safely.
This also forces operators to give the key a meaningful name visible in the n8n UI.

### Why scopes are comma-separated, not JSON

`N8N_INIT_API_KEY_SCOPES=workflow:read,workflow:create` matches Docker/K8s env-var
conventions and is trivially handled in shell scripts. JSON arrays require escaping
(`'["a","b"]'`) which is error-prone. The step splits on commas and trims whitespace.

### Scope validation

Each token is validated against `ALL_API_KEY_SCOPES` via `isApiKeyScope()`. Invalid
tokens cause the step to skip with a warning — startup never crashes. The step also
warns if any scope falls outside `OWNER_API_KEY_SCOPES` (unusual but not blocked).

`workflow:execute` is **not** a valid `ApiKeyScope` — workflow execution is not
exposed through the public API key scope system. Use `workflow:activate` /
`workflow:deactivate` for runtime control, or trigger executions via the REST API
with a scoped key.

### Key is logged in plaintext at `info` level

This is intentional — the operator needs to retrieve the key somehow. For
higher-security deployments use `N8N_INIT_API_KEY_OUTPUT_FILE` mounted on a tmpfs
or secrets volume instead of relying on the log stream.

---

## How to test locally (API key)

```bash
# 1. Fresh boot with owner + API key
bash scripts/bootstrap-recipes/api-key-setup.sh

# Expected logs:
#   Bootstrap step "owner": created
#   Bootstrap step "api-key": created
#   [info] Bootstrap: API key created  label=bootstrap-key  apiKey=eyJ...

# 2. Read the output file
cat scripts/bootstrap-recipes/bootstrap-secrets/api_key

# 3. Use it against the public API
curl -H "x-n8n-api-key: $(cat scripts/bootstrap-recipes/bootstrap-secrets/api_key)" \
  http://localhost:5678/api/v1/workflows

# 4. Idempotency — restart without deleting ~/.n8n
bash scripts/bootstrap-recipes/api-key-setup.sh
# Expected: Bootstrap step "api-key": skipped
# Output file unchanged
```

---

## Things to revisit before production (Phase 4)

### Unit tests are not in this branch

`ApiKeyBootstrapStep` needs unit tests covering:
- `apiKeyLabel` absent → `'skipped'` immediately
- Owner not found → `warn` + `'skipped'`
- `apiKeyScopes` empty → `warn` + `'skipped'`
- Invalid scope token → `warn` + `'skipped'`
- Key with label already exists → `'skipped'`, output file recovered if missing
- Happy path → key created, file written, `'created'`
- Race condition (unique constraint) → `'skipped'`
- Output file write fails → `warn`, still returns `'created'`

### Key is surfaced in logs

The raw JWT appears in log aggregators on first boot. Operators who want to suppress
this should set log level to filter out `info` for the bootstrap scope, and rely
solely on `N8N_INIT_API_KEY_OUTPUT_FILE` on a secrets volume.

### No expiration support

`expiresAt` is hardcoded to `null` (non-expiring). Expiring bootstrap keys would
require a re-deployment flow. If operators need key rotation, they should manage it
post-deploy via the public API or UI.
