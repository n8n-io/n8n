# OEM Instance Bootstrapping

This folder contains recipes for bootstrapping fully-configured n8n instances programmatically.
These recipes are designed for **OEM partners** who manage a fleet of n8n instances on behalf of
their customers and need a repeatable, automated way to bring up instances at scale — no UI
interaction, no manual steps.

The approach is environment-variable-driven: every aspect of an instance's initial configuration
is expressed as an env var or a mounted config file, suitable for delivery via Helm charts,
Docker Compose, or any other container orchestration tool.

> **`_FILE` suffix:** Every env var in this guide supports a `_FILE` variant. Instead of setting
> the value directly, you point to a file containing the value:
> ```bash
> # Instead of this:
> N8N_ENCRYPTION_KEY=my-secret-key
> # Use this (reads the key from a mounted file):
> N8N_ENCRYPTION_KEY_FILE=/run/secrets/encryption-key
> ```
> This is the recommended approach for all secrets. The file can come from a Kubernetes Secret,
> a Docker secret, a tmpfs mount populated by your secrets manager (Vault, AWS Secrets Manager,
> Azure Key Vault), or a file with `600` permissions on a VM. See the
> [Secrets Management](#secrets-management) section for details.

---

## Environment Variable Strategy

n8n environment variables fall into two distinct categories with different semantics.
Understanding the difference is important when operating a fleet.

### Runtime Variables

Standard env vars (e.g. `DB_POSTGRESDB_HOST`, `EXECUTIONS_TIMEOUT`) are consulted by
the running process on every boot. Changing them takes effect on the next restart. The
database is not involved — n8n reads them directly from the environment each time.

### Init Variables (`N8N_INIT_` prefix)

Bootstrap-only vars are prefixed with `N8N_INIT_`. They follow **"seed once, then DB
owns it"** semantics:

1. On first boot, n8n checks whether the resource already exists in the database.
2. If it does not exist, the var is read and the resource is created.
3. On every subsequent boot, the var is **ignored entirely** — even if its value has
   changed. The database is now the source of truth.

This means users can modify settings via the UI after initial setup without risk of
env vars overriding their changes on restart. It also makes restarts fully idempotent —
running with the same `N8N_INIT_*` vars is always safe.

```
First boot:   N8N_INIT_OWNER_EMAIL is set → owner does not exist → owner is created
Second boot:  N8N_INIT_OWNER_EMAIL is set → owner already exists → var is ignored
```

> **Exceptions** to the ignore-on-restart rule are case-by-case and explicitly
> documented where they exist.

**Prior art:** This pattern is used by GitLab (`GITLAB_ROOT_PASSWORD`), Keycloak
(`KEYCLOAK_ADMIN_PASSWORD`), and Grafana (`GF_SECURITY_ADMIN_PASSWORD`) for initial
admin credentials and default configs.

---

## Bootstrap Layers

A fully configured OEM instance requires six layers of configuration, applied in order:

```
Layer 1 — Infrastructure              Database, Redis, TLS, encryption key
Layer 2 — License                     Feature entitlements
Layer 3 — Identity & Access           Owner user, SSO provider, API key
Layer 4 — Instance Policies           Execution limits, node restrictions, security settings
Layer 5 — External Services & Embedding    Configure external endpoints, iframe embedding
Layer 6 — Application Data            Projects, workflows, credentials, variables
```

Layers 1 and 2 are fully supported today. Layer 3 has gaps (noted inline). Layers 4 and 5
are fully supported but need to be set explicitly — they don't default to OEM-appropriate values.
Layer 6 is delivered via the public API after the instance is running.

---

## Layer 1 — Infrastructure

### Encryption Key

The encryption key protects all stored credentials. **This must be set explicitly and must
persist across restarts.** If it is lost or changed after credentials have been stored, those
credentials become unreadable.

```bash
N8N_ENCRYPTION_KEY_FILE=/run/secrets/n8n-encryption-key
```

Generate a strong key once per instance and store it in your secrets manager:

```bash
openssl rand -hex 32
```

| Variable | Default | Description |
|---|---|---|
| `N8N_ENCRYPTION_KEY` | Auto-generated | Key used to encrypt stored credentials. Must be persisted. |

### Database

n8n supports SQLite (development/single-instance) and PostgreSQL (production/fleet).
For OEM deployments at scale, use PostgreSQL.

```bash
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres.internal
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db-password
DB_POSTGRESDB_SSL_ENABLED=true
```

| Variable | Default | Description |
|---|---|---|
| `DB_TYPE` | `sqlite` | `sqlite` or `postgresdb` |
| `DB_POSTGRESDB_HOST` | `localhost` | PostgreSQL host |
| `DB_POSTGRESDB_PORT` | `5432` | PostgreSQL port |
| `DB_POSTGRESDB_DATABASE` | `n8n` | Database name |
| `DB_POSTGRESDB_USER` | `postgres` | Database user |
| `DB_POSTGRESDB_PASSWORD` | — | Database password |
| `DB_POSTGRESDB_SCHEMA` | `public` | Schema name |
| `DB_POSTGRESDB_SSL_ENABLED` | `false` | Enable SSL for DB connection |
| `DB_POSTGRESDB_SSL_CA` | — | SSL CA certificate path |
| `DB_POSTGRESDB_POOL_SIZE` | `2` | Connection pool size |

### Execution Mode

Single-instance deployments use `regular` mode. For horizontal scaling (recommended for
OEM production), use `queue` mode, which requires Redis.

```bash
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=redis.internal
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_PASSWORD_FILE=/run/secrets/redis-password
QUEUE_BULL_REDIS_TLS=true
```

| Variable | Default | Description |
|---|---|---|
| `EXECUTIONS_MODE` | `regular` | `regular` (single-process) or `queue` (workers via Redis) |
| `QUEUE_BULL_REDIS_HOST` | `localhost` | Redis host |
| `QUEUE_BULL_REDIS_PORT` | `6379` | Redis port |
| `QUEUE_BULL_REDIS_PASSWORD` | — | Redis password |
| `QUEUE_BULL_REDIS_TLS` | `false` | Enable TLS for Redis connection |
| `QUEUE_BULL_REDIS_USERNAME` | — | Redis 6+ username |
| `QUEUE_BULL_REDIS_CLUSTER_NODES` | — | Comma-separated `host:port` for Redis Cluster |
| `N8N_REDIS_KEY_PREFIX` | `n8n` | Prefix for all Redis keys. Set a unique value per instance if sharing a Redis cluster across customers. |

### Multi-Main (High Availability)

For HA deployments, multiple main instances can share the load behind a load balancer.
Requires an enterprise license and queue mode.

```bash
N8N_MULTI_MAIN_SETUP_ENABLED=true
```

| Variable | Default | Description |
|---|---|---|
| `N8N_MULTI_MAIN_SETUP_ENABLED` | `false` | Enable multi-main HA mode |
| `N8N_MULTI_MAIN_SETUP_KEY_TTL` | `10` | Leader lock TTL in seconds |
| `N8N_MULTI_MAIN_SETUP_CHECK_INTERVAL` | `3` | Leader election check interval in seconds |

> **`N8N_INIT_*` vars in multi-main mode:** Set all `N8N_INIT_*` environment variables
> on **every** main instance, not just one. Bootstrap steps are idempotent — each
> instance checks the database before creating a resource, so only the first instance
> to reach a fresh DB performs the actual setup. The others detect the resource already
> exists and skip silently. This is safe without coordination because the checks rely
> on database-level unique constraints.

### Networking & URL Config

When n8n runs behind a reverse proxy (as it typically does in OEM deployments), these
variables ensure webhooks and editor links use the correct public URL.

```bash
WEBHOOK_URL=https://customer-123.oem.example.com/
N8N_EDITOR_BASE_URL=https://customer-123.oem.example.com/
N8N_PATH=/
N8N_PROXY_HOPS=1
```

| Variable | Default | Description |
|---|---|---|
| `WEBHOOK_URL` | — | Public base URL for webhooks. Set this when behind a proxy. |
| `N8N_EDITOR_BASE_URL` | — | Public URL for the editor. Used in email links. |
| `N8N_HOST` | `localhost` | Hostname n8n binds to |
| `N8N_PORT` | `5678` | HTTP port |
| `N8N_PROTOCOL` | `http` | `http` or `https` |
| `N8N_PATH` | `/` | URL path prefix |
| `N8N_PROXY_HOPS` | `0` | Number of reverse proxy hops (for correct IP detection) |
| `N8N_SSL_KEY` | — | Path to SSL private key (for direct TLS termination) |
| `N8N_SSL_CERT` | — | Path to SSL certificate |

---

## Layer 2 — License

n8n features (SSO, multi-main, source control, etc.) are gated by the license. Set the
license at deploy time — no UI interaction required.

```bash
# Option A: activate against the license server (requires outbound network)
N8N_LICENSE_ACTIVATION_KEY_FILE=/run/secrets/license-key
N8N_LICENSE_TENANT_ID=embed

# Option B: pre-signed certificate (air-gapped / offline)
N8N_LICENSE_CERT_FILE=/run/secrets/license-cert
N8N_LICENSE_AUTO_RENEW_ENABLED=false
N8N_LICENSE_TENANT_ID=embed
```

For OEM deployments, `N8N_LICENSE_TENANT_ID=embed` is the correct tenant type.

| Variable | Default | Description |
|---|---|---|
| `N8N_LICENSE_ACTIVATION_KEY` | — | Activation key. Activates against the license server on startup. |
| `N8N_LICENSE_CERT` | — | Pre-signed license certificate. Bypasses the license server entirely. |
| `N8N_LICENSE_TENANT_ID` | `1` | License tenant type. Use `embed` for OEM deployments. |
| `N8N_LICENSE_SERVER_URL` | `https://license.n8n.io/v1` | License server URL. Can be pointed at a SAP-hosted server. |
| `N8N_LICENSE_AUTO_RENEW_ENABLED` | `true` | Whether n8n phones home to renew the license. Set to `false` with `N8N_LICENSE_CERT`. |

---

## Layer 3 — Identity & Access

This layer sets up who can log in and how the OEM's management plane communicates
with the instance. It is the most critical layer for automated bootstrapping.

### 3a. Instance Owner

Every n8n instance has a single owner (global admin). On first boot, n8n creates a
shell user with no credentials — normally the setup wizard fills this in. For OEM
deployments, this must happen automatically.

> **⚠️ Not yet available — coming soon.**
> Native env var support for owner creation is not yet built into n8n. It is being
> added as part of the OEM bootstrapping initiative.

Once available, the pattern will be:

```bash
N8N_INIT_OWNER_EMAIL=admin@customer-123.oem.example.com
N8N_INIT_OWNER_FIRST_NAME=Admin
N8N_INIT_OWNER_LAST_NAME=Customer123
N8N_INIT_OWNER_PASSWORD_FILE=/run/secrets/owner-password
```

These are `N8N_INIT_` variables — they follow seed-once semantics. On first boot n8n
creates the owner from these values. On every subsequent boot they are ignored, so
users can change their name or password via the UI without env vars overriding them.

> **Security note:** Always use the `_FILE` variant for the password. Never pass
> plaintext passwords as env vars in production.

| Variable | Default | Description |
|---|---|---|
| `N8N_INIT_OWNER_EMAIL` | — | ⚠️ *Coming soon.* Email address for the instance owner. |
| `N8N_INIT_OWNER_FIRST_NAME` | — | ⚠️ *Coming soon.* First name for the instance owner. |
| `N8N_INIT_OWNER_LAST_NAME` | — | ⚠️ *Coming soon.* Last name for the instance owner. |
| `N8N_INIT_OWNER_PASSWORD` | — | ⚠️ *Coming soon.* Owner password (prefer `_FILE` variant). |

`N8N_INIT_OWNER_EMAIL`, `N8N_INIT_OWNER_HASHED_PASSWORD`

**Workaround until this is available:** Call `POST /owner/setup` from an init container
after `GET /healthz/readiness` returns 200. This endpoint requires no authentication
and is only available when the owner has not yet been set up.

```bash
curl -s -X POST http://n8n:5678/owner/setup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@customer-123.example.com\",
    \"password\": \"$(cat /run/secrets/owner-password)\",
    \"firstName\": \"Admin\",
    \"lastName\": \"Customer123\"
  }"
```

---

### 3b. SSO Provider Configuration

SSO enable/disable toggles and JIT provisioning behaviour are configurable via env vars
today. The provider-specific configuration (IdP metadata, client credentials) requires
additional work.

**SSO behaviour (available now):**

```bash
N8N_SSO_SAML_LOGIN_ENABLED=true           # or N8N_SSO_OIDC_LOGIN_ENABLED=true
N8N_SSO_JUST_IN_TIME_PROVISIONING=true    # Auto-create users on first SSO login
N8N_SSO_REDIRECT_LOGIN_TO_SSO=true        # Skip n8n login page, go straight to IdP
```

**Role provisioning from SSO claims (available now):**

```bash
N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE=true
N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES=true
N8N_SSO_SCOPES_NAME=n8n
N8N_SSO_SCOPES_INSTANCE_ROLE_CLAIM_NAME=n8n_instance_role
N8N_SSO_SCOPES_PROJECTS_ROLES_CLAIM_NAME=n8n_projects
```

| Variable | Default | Description |
|---|---|---|
| `N8N_SSO_SAML_LOGIN_ENABLED` | `false` | Enable SAML SSO |
| `N8N_SSO_OIDC_LOGIN_ENABLED` | `false` | Enable OIDC SSO |
| `N8N_SSO_LDAP_LOGIN_ENABLED` | `false` | Enable LDAP SSO |
| `N8N_SSO_JUST_IN_TIME_PROVISIONING` | `true` | Create user accounts automatically on first SSO login |
| `N8N_SSO_REDIRECT_LOGIN_TO_SSO` | `true` | Redirect the login page directly to the SSO provider |
| `N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE` | `false` | Map an SSO claim to the user's n8n instance role |
| `N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES` | `false` | Map an SSO claim to the user's project roles |
| `N8N_SSO_SCOPES_NAME` | `n8n` | OAuth scope name to request from the IdP |
| `N8N_SSO_SCOPES_INSTANCE_ROLE_CLAIM_NAME` | `n8n_instance_role` | Claim name that carries the instance role |
| `N8N_SSO_SCOPES_PROJECTS_ROLES_CLAIM_NAME` | `n8n_projects` | Claim name that carries project roles |

**Provider configuration (coming soon):**

> **⚠️ Not yet available — coming soon.**
> The IdP-specific settings (discovery URL, client ID/secret, SAML metadata) are
> currently stored in the database and can only be set via the admin UI or the
> `POST /sso/oidc/config` / `POST /sso/saml/config` API endpoints.
> Native env var / config file support is being added.

Once available, the pattern will be:

```bash
# OIDC
N8N_INIT_SSO_OIDC_CONFIG_FILE=/run/config/oidc.json

# SAML
N8N_INIT_SSO_SAML_CONFIG_FILE=/run/config/saml.json
```

These are `N8N_INIT_` variables. The config file is read once to seed the database on
first boot. After that, the database owns the SSO configuration — operators can update
it via the UI or API without the file being re-applied on restart.

Example `oidc.json`:
```json
{
  "discoveryEndpoint": "https://idp.oem.example.com/.well-known/openid-configuration",
  "clientId": "n8n-prod",
  "clientSecret": "{{ from secrets manager }}",
  "prompt": "select_account"
}
```

Example `saml.json`:
```json
{
  "metadataUrl": "https://idp.oem.example.com/metadata",
  "entityId": "https://n8n.oem.example.com",
  "attributeMapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }
}
```

**Workaround until this is available:** Call the SSO config API from an init container
after the owner is set up (these endpoints require authentication):

```bash
# Authenticate first
TOKEN=$(curl -s -X POST http://n8n:5678/rest/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"$(cat /run/secrets/owner-password)\"}" \
  | jq -r '.data.token')

# Configure OIDC
curl -s -X POST http://n8n:5678/rest/sso/oidc/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/run/config/oidc.json
```

---

### 3c. Management API Key

The OEM's management plane needs an API key to interact with the instance after it
comes up — to check status, manage workflows, invite users, etc.

> **⚠️ Not yet available — coming soon.**
> Pre-creating an API key via env var at first boot is not yet supported.
> Once available, the pattern will be:

```bash
N8N_INIT_API_KEY_FILE=/run/secrets/management-api-key
```

This is an `N8N_INIT_` variable. n8n creates the API key on first boot, associated
with the owner. On every subsequent boot the variable is ignored — the key persists
in the database and can be rotated via the API independently of this env var.

| Variable | Default | Description |
|---|---|---|
| `N8N_INIT_API_KEY` | — | ⚠️ *Coming soon.* Pre-create an API key for the owner on first boot. |

**Workaround until this is available:** Create the key from an init container after the
owner is set up:

```bash
API_KEY=$(curl -s -X POST http://n8n:5678/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"management-key"}' \
  | jq -r '.apiKey')

# Store the key back to your secrets manager
```

---

## Layer 4 — Instance Policies

These settings control resource consumption, security boundaries, and available
functionality. Set them at deploy time to apply uniformly across the fleet — they
should not be adjustable by end customers.

### Execution Limits

```bash
EXECUTIONS_TIMEOUT=3600
EXECUTIONS_TIMEOUT_MAX=3600
N8N_CONCURRENCY_PRODUCTION_LIMIT=10
EXECUTIONS_DATA_MAX_AGE=168
EXECUTIONS_DATA_PRUNE_MAX_COUNT=5000
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_ERROR=all
```

| Variable | Default | Description |
|---|---|---|
| `EXECUTIONS_TIMEOUT` | `-1` | Max execution duration in seconds. `-1` is unlimited. |
| `EXECUTIONS_TIMEOUT_MAX` | `3600` | Upper bound — individual workflows cannot exceed this. |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | `-1` | Max concurrent production executions. `-1` is unlimited. |
| `EXECUTIONS_DATA_MAX_AGE` | `336` | Hours to retain finished executions (336 = 14 days). |
| `EXECUTIONS_DATA_PRUNE_MAX_COUNT` | `10000` | Max number of executions to retain. |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | `all` | `all` or `none` — whether to save successful execution data. |
| `EXECUTIONS_DATA_SAVE_ON_ERROR` | `all` | `all` or `none` — whether to save failed execution data. |
| `EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS` | `true` | Save data from manual (test) runs. |

### Node Restrictions

Control which nodes customers can use. Useful for enforcing a tiered feature set
or blocking dangerous operations.

```bash
# Block specific nodes (blocklist approach)
NODES_EXCLUDE='["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger","n8n-nodes-base.readWriteFile"]'

# Or allow only specific nodes (allowlist approach — all others are hidden)
# NODES_INCLUDE='["n8n-nodes-base.httpRequest","n8n-nodes-base.set"]'

# Disable Python in the code node
N8N_PYTHON_ENABLED=false
```

| Variable | Default | Description |
|---|---|---|
| `NODES_EXCLUDE` | `["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger"]` | JSON array of node types to hide from customers. |
| `NODES_INCLUDE` | `[]` | JSON array of node types to exclusively show. Empty means all. |
| `N8N_PYTHON_ENABLED` | `true` | Allow Python in the Code node. |

### Security Settings

```bash
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_RESTRICT_FILE_ACCESS_TO=/home/node/.n8n-files
N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true
N8N_SSRF_PROTECTION_ENABLED=true
N8N_MFA_ENABLED=true
```

| Variable | Default | Description |
|---|---|---|
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | `true` | Block `$env` variable access inside node expressions. |
| `N8N_RESTRICT_FILE_ACCESS_TO` | `~/.n8n-files` | Directories that file-access nodes are allowed to read/write. |
| `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` | `true` | Block file nodes from accessing n8n's internal directories. |
| `N8N_SSRF_PROTECTION_ENABLED` | `false` | Block requests to private/internal IP ranges from nodes. |
| `N8N_SSRF_BLOCKED_IP_RANGES` | RFC-1918 + loopback | CIDRs to block when SSRF protection is on. |
| `N8N_SSRF_ALLOWED_HOSTNAMES` | — | Hostname patterns to allow even when SSRF protection is on. |
| `N8N_MFA_ENABLED` | `true` | Allow users to enable MFA on their accounts. |

**Security policies from env vars (coming soon):**

> **⚠️ Partially available.** Some security policies (password length rules, session
> inactivity timeout, admin-lock of security settings) are currently only configurable
> via the admin UI. Env var support for the remaining policies is planned.

### Community Packages

Whether customers are allowed to install community packages at all is a policy
decision — set it here alongside other node restrictions.

```bash
N8N_COMMUNITY_PACKAGES_ENABLED=false
```

| Variable | Default | Description |
|---|---|---|
| `N8N_COMMUNITY_PACKAGES_ENABLED` | `true` | Allow customers to install community nodes from the npm registry. |

> **Pre-installing specific packages** (e.g. seeding a customer instance with the
> packages their workflows depend on) belongs in [Layer 6 — Application Data](#layer-6--application-data),
> not here. Which packages are installed is content, not policy — it varies per
> customer and requires the instance to be running.

---

## Layer 5 — External Services & Embedding

By default, n8n connects to several n8n.io-hosted services — telemetry, template
library, version notifications. In an OEM deployment you have three choices for each:

- **Redirect** to your own equivalent service (e.g. your own PostHog, your own template server)
- **Disable** entirely (for air-gapped deployments or where the service has no equivalent)
- **Leave as-is** if your OEM agreement and deployment topology allow it

The variables below give you full control over each external connection.

### Telemetry & Diagnostics

n8n sends anonymous usage telemetry to Segment and PostHog by default. You can
redirect this to your own PostHog instance or disable it entirely.

```bash
# Option A: redirect to your own PostHog
N8N_DIAGNOSTICS_POSTHOG_API_KEY=phc_your_own_key
N8N_DIAGNOSTICS_POSTHOG_API_HOST=https://posthog.oem.example.com
N8N_DIAGNOSTICS_CONFIG_FRONTEND=your-segment-key;https://telemetry.oem.example.com
N8N_DIAGNOSTICS_CONFIG_BACKEND=your-segment-key;https://telemetry.oem.example.com

# Option B: disable entirely
N8N_DIAGNOSTICS_ENABLED=false
```

| Variable | Default | Description |
|---|---|---|
| `N8N_DIAGNOSTICS_ENABLED` | `true` | Master switch for all telemetry. Set to `false` to disable entirely. |
| `N8N_DIAGNOSTICS_POSTHOG_API_KEY` | n8n's key | PostHog project API key. Override to send telemetry to your own PostHog. |
| `N8N_DIAGNOSTICS_POSTHOG_API_HOST` | `https://us.i.posthog.com` | PostHog API host. |
| `N8N_DIAGNOSTICS_CONFIG_FRONTEND` | n8n's Segment config | Frontend telemetry endpoint (`key;url` format). |
| `N8N_DIAGNOSTICS_CONFIG_BACKEND` | n8n's Segment config | Backend telemetry endpoint (`key;url` format). |

### Templates

n8n fetches workflow templates from api.n8n.io by default. You can host your own
template library and point n8n at it, or disable templates entirely.

```bash
# Option A: serve templates from your own endpoint
N8N_TEMPLATES_HOST=https://templates.oem.example.com/api/

# Option B: disable the templates panel entirely
N8N_TEMPLATES_ENABLED=false
```

| Variable | Default | Description |
|---|---|---|
| `N8N_TEMPLATES_ENABLED` | `true` | Show the workflow templates panel. |
| `N8N_TEMPLATES_HOST` | `https://api.n8n.io/api/` | Templates API base URL. Point at your own server to serve custom templates. |

### Version Notifications

n8n checks api.n8n.io for new releases and shows update banners. In an OEM deployment
the version is managed by you, not the customer — these should typically be disabled.

```bash
N8N_VERSION_NOTIFICATIONS_ENABLED=false
N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED=false
```

| Variable | Default | Description |
|---|---|---|
| `N8N_VERSION_NOTIFICATIONS_ENABLED` | `true` | Check for new n8n versions. |
| `N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED` | `true` | Show "what's new" banners after upgrades. |
| `N8N_VERSION_NOTIFICATIONS_ENDPOINT` | `https://api.n8n.io/api/versions/` | Version check endpoint. Can be pointed at your own service. |

### Onboarding & Usage Page

```bash
N8N_PERSONALIZATION_ENABLED=false
N8N_HIDE_USAGE_PAGE=true
```

| Variable | Default | Description |
|---|---|---|
| `N8N_PERSONALIZATION_ENABLED` | `true` | Show onboarding personalisation prompts on first login. Typically not relevant in an OEM context where the user arrives via SSO. |
| `N8N_HIDE_USAGE_PAGE` | `false` | Hide the usage and statistics page from end customers. |

### Iframe Embedding

When n8n is embedded inside an OEM platform's iframe, cross-origin session handling
requires specific cookie and security header settings. **All four variables below must
be set together** — setting only some of them will cause authentication to silently fail.

```bash
N8N_SAMESITE_COOKIE=none
N8N_SECURE_COOKIE=true
N8N_CONTENT_SECURITY_POLICY='{"frameAncestors":["https://*.oem.example.com"]}'
N8N_CROSS_ORIGIN_OPENER_POLICY=unsafe-none
```

| Variable | Default | Description |
|---|---|---|
| `N8N_SAMESITE_COOKIE` | `lax` | Must be `none` for cross-origin iframe sessions. |
| `N8N_SECURE_COOKIE` | `true` | Must be `true` when `SameSite=none` — browsers reject `SameSite=none` without `Secure`. |
| `N8N_CONTENT_SECURITY_POLICY` | `{}` | Helmet.js CSP directives as a JSON string. Set `frameAncestors` to your platform's domain. |
| `N8N_CROSS_ORIGIN_OPENER_POLICY` | `same-origin` | Set to `unsafe-none` to allow the iframe parent to communicate with the frame. |

### Deployment Identity

Tag each instance with its identity for observability and metrics correlation.

```bash
N8N_DEPLOYMENT_TYPE=oem
DEPLOYMENT_NAME=customer-123
ENVIRONMENT=production
```

| Variable | Default | Description |
|---|---|---|
| `N8N_DEPLOYMENT_TYPE` | `default` | Deployment type tag. Use `oem` for OEM deployments. |
| `DEPLOYMENT_NAME` | — | Unique identifier for this instance. Appears in logs and error tracking. |
| `ENVIRONMENT` | — | Environment name (e.g. `production`, `staging`). |

### Logging

```bash
N8N_LOG_LEVEL=warn
N8N_LOG_OUTPUT=console
N8N_LOG_FORMAT=json
```

| Variable | Default | Description |
|---|---|---|
| `N8N_LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug`, or `silent` |
| `N8N_LOG_OUTPUT` | `console` | `console`, `file`, or both comma-separated |
| `N8N_LOG_FORMAT` | `text` | `text` or `json`. Use `json` for log aggregation pipelines. |
| `N8N_LOG_FILE_LOCATION` | `logs/n8n.log` | Log file path (when `N8N_LOG_OUTPUT` includes `file`) |

---

## Secrets Management

The `_FILE` pattern works with any mechanism that can deliver a file to the container.

### Kubernetes Secrets

```yaml
# 1. Create the secret
apiVersion: v1
kind: Secret
metadata:
  name: n8n-bootstrap
  namespace: customer-123
type: Opaque
stringData:
  encryption-key: "your-generated-key"
  owner-password: "initial-owner-password"
  management-api-key: "sk-mgmt-abc123"

---
# 2. Mount in the Pod spec
spec:
  containers:
    - name: n8n
      env:
        - name: N8N_ENCRYPTION_KEY_FILE
          value: /run/secrets/n8n/encryption-key
        - name: N8N_INIT_OWNER_PASSWORD_FILE    # coming soon
          value: /run/secrets/n8n/owner-password
        - name: N8N_INIT_API_KEY_FILE   # coming soon
          value: /run/secrets/n8n/management-api-key
      volumeMounts:
        - name: n8n-secrets
          mountPath: /run/secrets/n8n
          readOnly: true
  volumes:
    - name: n8n-secrets
      secret:
        secretName: n8n-bootstrap
```

### Docker Compose

```yaml
services:
  n8n:
    image: n8nio/n8n
    environment:
      N8N_ENCRYPTION_KEY_FILE: /run/secrets/encryption_key
    secrets:
      - encryption_key

secrets:
  encryption_key:
    file: ./secrets/encryption-key.txt  # never commit this file
```

Docker mounts secrets at `/run/secrets/<name>` on a tmpfs — they never touch disk.

### Bare Metal / VMs

```bash
# Write secret to a tmpfs location with restricted permissions
install -m 600 -o n8n -g n8n /dev/stdin /run/n8n-secrets/encryption-key <<< "$SECRET_VALUE"

# Point n8n at it
export N8N_ENCRYPTION_KEY_FILE=/run/n8n-secrets/encryption-key
```

Populate the secret value from your secrets manager (AWS SSM Parameter Store, HashiCorp
Vault, etc.) in the startup script before launching n8n.

---

## Readiness & Bootstrap Sequencing

### Health Endpoints

| Endpoint | Returns 200 when... |
|---|---|
| `/healthz` | HTTP server is running (liveness) |
| `/healthz/readiness` | DB connected + migrations done + server fully initialized |

Always poll `/healthz/readiness` before running post-deploy init steps. The liveness
endpoint returns 200 before the database is ready.

> **⚠️ Bootstrap-aware readiness (coming soon).** Currently, `/healthz/readiness`
> returns 200 before the owner is set up or SSO is configured. Once env-var-driven
> bootstrapping is added (Layers 3a–3c above), the readiness endpoint will stay at 503
> until all bootstrap steps have completed, so your orchestrator can safely sequence
> post-deploy API calls.

### Recommended Bootstrap Sequence

```
1. Infrastructure ready (DB, Redis)
   └── 2. n8n starts → DB migrations run → /healthz/readiness → 200
         └── 3. Owner setup (env var or init container API call)
               └── 4. SSO config (env var or init container API call)
                     └── 5. API key creation (env var or init container API call)
                           └── 6. Application data (projects, workflows, credentials, variables via API)
```

When env var support for steps 3–5 is available, they will happen automatically inside
step 2, and step 6 can start as soon as readiness returns 200.

---

## Layer 6 — Application Data

Once the instance is running and the owner is set up, an OEM may want to pre-populate
it with application-level content so the customer lands in a ready-to-use environment
rather than a blank canvas.

This layer is distinct from the others: it is not driven by environment variables, but
by API calls made after the instance is live. The content is customer-specific and
dynamic — it cannot be expressed as static configuration.

### What Falls in This Layer

- **Projects** — create the initial project structure for the customer
- **Project folders** — organise workflows into logical groups from day one
- **Workflows** — seed starter workflows, templates, or pre-built automations
- **Credentials** — pre-configure connections to systems the customer already uses
- **Variables** — set instance-level variables the customer's workflows depend on
- **Tags** — apply a consistent taxonomy across seeded workflows
- **Community packages** — pre-install the npm packages the customer's workflows depend on

### Current State

All of the above are fully supported via the public API today. An OEM can call these
endpoints from a post-deploy init job (a Kubernetes Job, a CI/CD pipeline step, or
an init container) once `/healthz/readiness` returns 200 and an API key is available.

> **Work needed.** While the individual API endpoints exist, there is no standardised
> way for an OEM to define a reusable "instance template" — a declarative manifest
> describing the application data that should be present in every new instance. An OEM
> managing hundreds of instances today must maintain their own scripts to call these
> APIs consistently.
>
> A future solution in this space might look like an importable bundle (a structured
> JSON or YAML file) that n8n applies idempotently at first boot, similar to how
> Grafana's provisioning directory works. This is not yet designed or scheduled.

---

## Complete Example

Combining all layers into a single environment variable block for a production OEM instance:

```bash
# === Layer 1: Infrastructure ===
N8N_ENCRYPTION_KEY_FILE=/run/secrets/encryption-key
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres.internal
DB_POSTGRESDB_DATABASE=n8n_customer123
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db-password
DB_POSTGRESDB_SSL_ENABLED=true
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=redis.internal
QUEUE_BULL_REDIS_PASSWORD_FILE=/run/secrets/redis-password
QUEUE_BULL_REDIS_TLS=true
N8N_REDIS_KEY_PREFIX=customer-123
WEBHOOK_URL=https://customer-123.oem.example.com/
N8N_EDITOR_BASE_URL=https://customer-123.oem.example.com/
N8N_PROXY_HOPS=1

# === Layer 2: License ===
N8N_LICENSE_CERT_FILE=/run/secrets/license-cert
N8N_LICENSE_TENANT_ID=embed
N8N_LICENSE_AUTO_RENEW_ENABLED=false

# === Layer 3: Identity & Access ===
# N8N_INIT_* vars: seed once on first boot, ignored on restart (DB owns it after)
N8N_INIT_OWNER_EMAIL=admin@customer-123.oem.example.com
N8N_INIT_OWNER_FIRST_NAME=Admin
N8N_INIT_OWNER_LAST_NAME=Customer123
N8N_INIT_OWNER_PASSWORD_FILE=/run/secrets/owner-password   # coming soon
N8N_INIT_SSO_OIDC_CONFIG_FILE=/run/config/oidc.json       # coming soon
N8N_INIT_API_KEY_FILE=/run/secrets/management-api-key      # coming soon
# Runtime SSO toggles (consulted on every boot):
N8N_SSO_OIDC_LOGIN_ENABLED=true
N8N_SSO_JUST_IN_TIME_PROVISIONING=true
N8N_SSO_REDIRECT_LOGIN_TO_SSO=true
N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE=true
N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES=true

# === Layer 4: Instance Policies ===
EXECUTIONS_TIMEOUT=3600
EXECUTIONS_TIMEOUT_MAX=3600
N8N_CONCURRENCY_PRODUCTION_LIMIT=10
EXECUTIONS_DATA_MAX_AGE=168
EXECUTIONS_DATA_PRUNE_MAX_COUNT=5000
NODES_EXCLUDE='["n8n-nodes-base.executeCommand","n8n-nodes-base.localFileTrigger"]'
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_SSRF_PROTECTION_ENABLED=true
N8N_COMMUNITY_PACKAGES_ENABLED=false

# === Layer 5: External Services & Embedding ===
# Telemetry: redirect to your own PostHog or disable entirely
N8N_DIAGNOSTICS_ENABLED=false          # or redirect: set POSTHOG_API_KEY + POSTHOG_API_HOST
# Templates: serve from your own library or disable
N8N_TEMPLATES_ENABLED=false            # or redirect: set N8N_TEMPLATES_HOST
# Version notifications: managed by you, not the customer
N8N_VERSION_NOTIFICATIONS_ENABLED=false
N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED=false
# Onboarding
N8N_PERSONALIZATION_ENABLED=false
N8N_HIDE_USAGE_PAGE=true
N8N_SAMESITE_COOKIE=none
N8N_SECURE_COOKIE=true
N8N_CONTENT_SECURITY_POLICY='{"frameAncestors":["https://*.oem.example.com"]}'
N8N_CROSS_ORIGIN_OPENER_POLICY=unsafe-none
N8N_DEPLOYMENT_TYPE=oem
DEPLOYMENT_NAME=customer-123
ENVIRONMENT=production
N8N_LOG_LEVEL=warn
N8N_LOG_FORMAT=json
```

---

## Alternative: Dedicated Init Config File

> **Status:** This is a potential future approach, documented here for reference.
> No changes to the current env-var-based strategy are required to adopt it.

Instead of using `N8N_INIT_*` environment variables for bootstrap configuration,
all init-only settings could be moved into a dedicated file (JSON or YAML)
referenced by a single env var:

```bash
# The only bootstrap-related env var needed
N8N_INIT_CONFIG_FILE=/etc/n8n/init.json
```

Example init file:

```json
{
  "sso": {
    "provider": "saml",
    "entryPoint": "https://idp.example.com/sso",
    "certificate": "MIIC..."
  },
  "admin": {
    "email": "admin@example.com"
  },
  "license": {
    "activationKey": "..."
  }
}
```

### Why Consider This

- **Hard boundary:** If it is in the file, it is init-only. If it is an env var,
  it is runtime. No reliance on naming conventions.
- **Richer structure:** Nested config (SSO certs, complex objects) is natural in
  JSON/YAML but awkward as flat env vars.
- **Easier to remove:** Operators can delete the file after first boot to make the
  one-shot intent physically explicit. Env vars are harder to remove in many
  orchestration setups.
- **Schema validation:** The file can be validated as a unit at startup against a
  defined schema, rather than validating scattered env vars individually.
- **Better for secrets:** The file can have restricted file permissions (`600`),
  be mounted from a secrets manager, or be injected by an init container.

### Semantics

The same "seed once, then DB owns it" rules apply:

1. On first boot, if the file exists and the resource does not exist in the DB,
   create it from the file.
2. On subsequent boots, the file is ignored — even if its contents changed.
3. The database remains the source of truth after initial setup.

### When to Prefer Env Vars Instead

For very simple cases (one or two primitive values), a dedicated file may be
overkill. The `N8N_INIT_*` env var approach remains a lightweight alternative
for simple bootstrapping needs. Both approaches could coexist — the file for
structured config, env vars for simple overrides — but starting with one
consistent pattern is recommended.
