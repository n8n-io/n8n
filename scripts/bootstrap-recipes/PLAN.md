# OEM Instance Bootstrapping — Implementation Plan

**Status:** Planning / POC
**Goal:** Make it possible for an OEM to bootstrap a fully-configured n8n instance
entirely via environment variables and mounted config files, with no UI interaction
or manual post-deploy steps.

This plan is derived from the gaps identified in `README.md`. Each section maps to
a self-contained unit of work, ordered by dependency and priority.

---

## Overview

The work breaks into four phases:

```
Phase 1 — N8N_INIT_* infrastructure       The shared mechanism all init vars depend on
Phase 2 — Owner bootstrap                  First user: N8N_INIT_OWNER_*
Phase 3 — SSO provider seeding             N8N_INIT_SSO_OIDC/SAML_CONFIG_FILE
Phase 4 — API key bootstrap                N8N_INIT_API_KEY
Phase 5 — Bootstrap-aware readiness        /healthz/readiness reflects bootstrap state
Phase 6 — Community packages (Layer 6)     N8N_INIT_COMMUNITY_PACKAGES (future)
```

Phases 1–4 are the core POC target for this branch. Phase 5 is a small follow-on.
Phase 6 requires more design and is lower priority.

---

## Phase 1 — `N8N_INIT_*` Infrastructure

### What

Establish the shared mechanism that all `N8N_INIT_` variables depend on:

- A dedicated bootstrap service/hook that runs once during startup, after DB
  migrations and before the HTTP server starts accepting traffic
- The "seed once" check: read the env var, check if the resource exists in DB,
  create it if not, skip if it does
- The `_FILE` suffix support for all new init vars (reuse the existing pattern
  in `packages/@n8n/config/src/decorators.ts`)

### Where in the codebase

| File | Change |
|---|---|
| `packages/cli/src/commands/start.ts` | Add bootstrap hook invocation after DB init, before HTTP server start |
| `packages/cli/src/bootstrap/` (new directory) | New `BootstrapService` that orchestrates all `N8N_INIT_*` processing |
| `packages/@n8n/config/src/configs/bootstrap.config.ts` (new) | Config class declaring all `N8N_INIT_` env vars using `@Env()` decorators |

### Acceptance criteria

- A `BootstrapService` exists and is called during startup
- It runs after `dbConnection.migrate()` and before `server.start()`
- Each bootstrap step is individually skippable (if env var not set, skip silently)
- Each bootstrap step is idempotent (safe to run on every boot, only acts on first)
- Adding a new `N8N_INIT_` var requires only: a new config entry + a new step in `BootstrapService`

### Multi-Main / Distributed Mode

In multi-main deployments, multiple main instances start simultaneously against the
same database. The bootstrap service does **not** depend on leader election — it runs
on every instance. Safety comes from DB-level idempotency:

- Each step checks "does this resource exist?" before creating it.
- These checks rely on existing unique constraints (e.g., owner email, settings keys)
  or use `INSERT ... ON CONFLICT DO NOTHING` semantics so that only one instance wins
  the race. The others see the resource already exists and skip.
- This is simpler than gating on leader election, which is async, Redis-dependent, and
  happens later in the lifecycle (after the HTTP server starts — too late for bootstrap).

All `N8N_INIT_*` env vars must be set on **every** main instance, not just one, since
any instance may be the first to boot against a fresh DB.

### Notes

- This is the foundational piece. Phases 2, 3, and 4 are all just steps registered
  with this service.
- Keep it simple: a sequential list of steps, each returning `skipped | created`.
  No complex orchestration needed.

---

## Phase 2 — Owner Bootstrap

### What

When `N8N_INIT_OWNER_EMAIL` is set and no owner exists yet, automatically complete
the owner setup that would otherwise require the UI wizard.

### Env vars

```bash
N8N_INIT_OWNER_EMAIL=admin@customer.example.com
N8N_INIT_OWNER_FIRST_NAME=Admin
N8N_INIT_OWNER_LAST_NAME=Customer
N8N_INIT_OWNER_PASSWORD_FILE=/run/secrets/owner-password
```

### Where in the codebase

| File | Change |
|---|---|
| `packages/cli/src/bootstrap/steps/owner.bootstrap.ts` (new) | Bootstrap step: read env vars, call `OwnershipService.setupOwner()` |
| `packages/cli/src/services/ownership.service.ts` | Existing — no change needed, just call it |
| `packages/cli/src/databases/repositories/settings.repository.ts` | Read `isInstanceOwnerSetUp` to implement the skip-if-exists check |
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Declare the four `N8N_INIT_OWNER_*` vars |

### Acceptance criteria

- Starting n8n with `N8N_INIT_OWNER_EMAIL` set and a fresh DB creates the owner and
  sets `isInstanceOwnerSetUp = true`
- The setup wizard is not shown on first visit — the instance goes straight to login
- Starting with the same env var on a second boot (owner already exists) is a no-op
- Changing `N8N_INIT_OWNER_EMAIL` value after first boot has no effect
- `N8N_INIT_OWNER_PASSWORD` without the `_FILE` suffix also works (for dev convenience)
- Without `N8N_INIT_OWNER_EMAIL` set, behaviour is identical to today (wizard shown)

### Security note

Accept both plaintext (`N8N_INIT_OWNER_PASSWORD`) and pre-hashed bcrypt
(`N8N_INIT_OWNER_PASSWORD_HASH`) to match the Cloud hooks pattern. The `_FILE`
variant should be the documented recommendation for production.

---

## Phase 3 — SSO Provider Config Seeding

### What

When `N8N_INIT_SSO_OIDC_CONFIG_FILE` or `N8N_INIT_SSO_SAML_CONFIG_FILE` is set and
no SSO config exists in the DB yet, read the JSON file and seed the `settings` table.

After seeding, the DB owns the config. Operators can modify it via the UI or API
without the file being re-applied on restart.

### Env vars

```bash
# OIDC
N8N_INIT_SSO_OIDC_CONFIG_FILE=/run/config/oidc.json

# SAML
N8N_INIT_SSO_SAML_CONFIG_FILE=/run/config/saml.json
```

### Config file shapes

OIDC (`oidc.json`):
```json
{
  "discoveryEndpoint": "https://idp.example.com/.well-known/openid-configuration",
  "clientId": "n8n-prod",
  "clientSecret": "secret"
}
```

SAML (`saml.json`):
```json
{
  "metadataUrl": "https://idp.example.com/metadata",
  "entityId": "https://n8n.example.com",
  "attributeMapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }
}
```

### Where in the codebase

| File | Change |
|---|---|
| `packages/cli/src/bootstrap/steps/sso.bootstrap.ts` (new) | Bootstrap step: read file, validate shape, call existing SSO service save methods |
| `packages/cli/src/modules/sso-oidc/oidc.service.ee.ts` | Existing — call `saveConfig()` (already exists, used by the API endpoint) |
| `packages/cli/src/modules/sso-saml/saml.service.ee.ts` | Existing — call `setSamlSettings()` (already exists) |
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Declare the two `N8N_INIT_SSO_*_CONFIG_FILE` vars |

### Acceptance criteria

- With `N8N_INIT_SSO_OIDC_CONFIG_FILE` set and no OIDC config in DB, OIDC is
  configured on startup — no API call needed after boot
- With `N8N_INIT_SSO_SAML_CONFIG_FILE` set and no SAML config in DB, SAML is
  configured on startup
- Modifying the JSON file and restarting does NOT overwrite existing DB config
- An invalid JSON file causes a startup warning (logged), not a crash
- These steps depend on Phase 2 (owner must exist before SSO is useful, but the
  steps themselves are independent — SSO config can be seeded even before owner login)

### Notes

- The SSO enable/disable toggles (`N8N_SSO_OIDC_LOGIN_ENABLED`, etc.) remain runtime
  vars — they are not changed by this phase. The config file only seeds the provider
  settings (credentials, endpoints).
- In multi-main mode, config changes are already broadcast via pub/sub
  (`saml.service.ee.ts` handles this). The bootstrap step just needs to call the
  same save method the API endpoint uses.

---

## Phase 4 — API Key Bootstrap

### What

When `N8N_INIT_API_KEY` is set and no API key exists yet for the owner, create one
with that value. This gives the OEM's management plane a known key to use immediately
after the instance comes up, without a post-deploy auth flow.

### Env vars

```bash
N8N_INIT_API_KEY_FILE=/run/secrets/management-api-key
```

### Where in the codebase

| File | Change |
|---|---|
| `packages/cli/src/bootstrap/steps/api-key.bootstrap.ts` (new) | Bootstrap step: check if any API key exists, create one for owner if not |
| `packages/cli/src/databases/repositories/api-key.repository.ts` | Existing — use to check existence and create |
| `packages/@n8n/config/src/configs/bootstrap.config.ts` | Declare `N8N_INIT_API_KEY` var |

### Acceptance criteria

- Starting with `N8N_INIT_API_KEY_FILE` set creates an API key for the owner on
  first boot
- The key can immediately be used to call `GET /api/v1/workflows` after
  `/healthz/readiness` returns 200
- On second boot the step is skipped (key already exists)
- Rotating the key (deleting and recreating via API) is not affected by the env var
  remaining set — the skip check is "does any key exist for this user", not
  "does this specific key value exist"

### Dependency

- Must run after Phase 2 (owner must exist to associate the key with)

---

## Phase 5 — Bootstrap-Aware Readiness Check

### What

Currently `/healthz/readiness` returns 200 as soon as the HTTP server is
initialised — before bootstrap steps have completed. An OEM's init container
polling readiness has no way to know the instance is actually ready to use.

When `N8N_INIT_*` vars are present, the readiness endpoint should stay at 503
until all bootstrap steps have completed.

### Where in the codebase

| File | Change |
|---|---|
| `packages/cli/src/health-check/health-check.service.ts` | Add a `bootstrapComplete` flag to the readiness check |
| `packages/cli/src/bootstrap/bootstrap.service.ts` | Set `bootstrapComplete = true` after all steps finish |
| `packages/cli/src/commands/start.ts` | Ensure HTTP server is reachable (for health polling) but `readiness` returns 503 until bootstrap completes |

### Acceptance criteria

- Without any `N8N_INIT_*` vars set, readiness behaves exactly as today
- With `N8N_INIT_*` vars set, `/healthz/readiness` returns 503 until all bootstrap
  steps have completed, then 200
- `/healthz` (liveness) is unaffected — it still returns 200 as soon as the server
  starts (needed for K8s not to restart the pod during bootstrap)

---

## Phase 6 — Community Packages Pre-install (Future)

### What

Allow an OEM to pre-install a specific set of community packages on first boot,
so the customer's instance arrives with the nodes their workflows depend on.

### Env var (not yet designed)

```bash
N8N_INIT_COMMUNITY_PACKAGES=n8n-nodes-salesforce@1.2.0,n8n-nodes-sap
```

### Open questions before this can be designed

- How does package installation interact with the task runner sandbox?
- What happens if a package fails to install — hard failure or warning?
- Should the list be an env var (simple, limited) or a file (more flexible)?
- How does this interact with `N8N_COMMUNITY_PACKAGES_ENABLED=false`? (presumably
  the operator can pre-install packages even if end users cannot add more)

### Status

Not planned for the current POC. Needs design discussion before implementation.

---

## What Already Works (No New Code Needed)

These items from the README are fully functional today and only need to be
exercised in the bootstrap recipes / init container scripts:

- Infrastructure config (DB, Redis, TLS, encryption key)
- License activation (`N8N_LICENSE_ACTIVATION_KEY`, `N8N_LICENSE_CERT`)
- SSO toggles and JIT provisioning
- Role provisioning from SSO claims
- Execution limits, node restrictions, security settings
- External services configuration (telemetry, templates, version checks)
- Iframe embedding settings
- Owner setup via `POST /owner/setup` (workaround until Phase 2 ships)
- SSO config via `POST /sso/oidc/config` (workaround until Phase 3 ships)
- API key creation via `POST /api/v1/api-keys` (workaround until Phase 4 ships)

---

## POC Scope for This Branch

For an initial proof of concept, the goal is to demonstrate the end-to-end flow
working for the most critical path: **a fresh instance that bootstraps its owner
and is immediately usable without touching a UI**.

Suggested POC order:

1. Phase 1 — `BootstrapService` skeleton with one no-op step (proves the hook point)
2. Phase 2 — Owner bootstrap (most impactful, unblocks everything else)
3. Phase 4 — API key bootstrap (proves the management plane can connect immediately)
4. Phase 5 — Readiness check (proves an init container can safely sequence on top)
5. Phase 3 — SSO seeding (more complex, involves existing EE modules)

A working POC for steps 1–4 is enough to validate the architecture and unblock
SAP from building their Helm-based provisioning flow.

---

## Key Files Reference

| File | Relevance |
|---|---|
| `packages/cli/src/commands/start.ts` | Startup sequence — where bootstrap hook is called |
| `packages/cli/src/commands/base-command.ts` | Shared init — DB migration completes here |
| `packages/cli/src/controllers/owner.controller.ts` | `POST /owner/setup` (skipAuth) — existing logic to reuse |
| `packages/cli/src/services/ownership.service.ts` | `setupOwner()` — call this from Phase 2 step |
| `packages/cli/src/modules/sso-oidc/oidc.service.ee.ts` | OIDC config save — call from Phase 3 step |
| `packages/cli/src/modules/sso-saml/saml.service.ee.ts` | SAML config save — call from Phase 3 step |
| `packages/cli/src/databases/repositories/settings.repository.ts` | `isInstanceOwnerSetUp` setting |
| `packages/cli/src/health-check/health-check.service.ts` | Readiness check — Phase 5 target |
| `packages/@n8n/config/src/configs/` | Where to declare new `N8N_INIT_` env vars |
| `packages/@n8n/config/src/decorators.ts` | `_FILE` suffix implementation — reuse for new vars |
