#!/usr/bin/env bash
set -euo pipefail

# Recipe: OIDC Provider Config Seeding (Phase 3)
#
# Starts a local Keycloak instance in Docker (same config as the E2E test
# container) and seeds the OIDC config on first boot.
#
# Prerequisites: Docker must be running.
#
# Test credentials are stored in bootstrap-secrets/ (seeded by _common.sh on first run).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

KEYCLOAK_PORT=8443
KEYCLOAK_CONTAINER="n8n-keycloak-local"
KEYCLOAK_IMAGE="keycloak/keycloak:26.4"
REALM_NAME="test"
CLIENT_ID="n8n-e2e"
CLIENT_SECRET="$(read_secret oidc_client_secret)"
CERT_FILE="$SECRETS_DIR/keycloak-ca.pem"
OIDC_CONFIG_FILE="$SECRETS_DIR/oidc-config.json"
N8N_CALLBACK_URL="http://localhost:5678/rest/sso/oidc/callback"
PASSWORD_FILE="$SECRETS_DIR/owner_password"
KEYCLOAK_KEYSTORE_PW="$(read_secret keycloak_keystore_password)"
KEYCLOAK_ADMIN_PW="$(read_secret keycloak_admin_password)"
KEYCLOAK_TEST_USER_PW="$(read_secret keycloak_test_user_password)"

# ---------------------------------------------------------------------------
# 1. Start Keycloak (skip if already running)
# ---------------------------------------------------------------------------

if ! docker inspect "$KEYCLOAK_CONTAINER" &>/dev/null; then
  echo "Generating Keycloak realm config..."
  cat > "$SECRETS_DIR/realm.json" <<JSON
{
  "realm": "$REALM_NAME",
  "enabled": true,
  "sslRequired": "none",
  "loginWithEmailAllowed": true,
  "clients": [
    {
      "clientId": "$CLIENT_ID",
      "enabled": true,
      "clientAuthenticatorType": "client-secret",
      "secret": "$CLIENT_SECRET",
      "redirectUris": ["$N8N_CALLBACK_URL", "${N8N_CALLBACK_URL}/*"],
      "webOrigins": ["*"],
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "publicClient": false,
      "protocol": "openid-connect"
    }
  ],
  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "email": "test@n8n.io",
      "emailVerified": true,
      "firstName": "Test",
      "lastName": "User",
      "credentials": [{ "type": "password", "value": "$KEYCLOAK_TEST_USER_PW", "temporary": false }]
    }
  ]
}
JSON

  cat > "$SECRETS_DIR/keycloak-start.sh" <<SCRIPT
#!/bin/bash
set -e
keytool -genkeypair \
  -storepass $KEYCLOAK_KEYSTORE_PW -storetype PKCS12 -keyalg RSA -keysize 2048 \
  -dname "CN=localhost" -alias server \
  -ext "SAN=DNS:localhost,IP:127.0.0.1" \
  -keystore /opt/keycloak/conf/server.keystore

keytool -exportcert -alias server \
  -keystore /opt/keycloak/conf/server.keystore \
  -rfc -file /tmp/keycloak-ca.pem -storepass $KEYCLOAK_KEYSTORE_PW

exec /opt/keycloak/bin/kc.sh start-dev \
  --import-realm \
  --https-key-store-file=/opt/keycloak/conf/server.keystore \
  --https-key-store-password=$KEYCLOAK_KEYSTORE_PW \
  --hostname=https://localhost:${KEYCLOAK_PORT} \
  --hostname-backchannel-dynamic=true
SCRIPT
  chmod 755 "$SECRETS_DIR/keycloak-start.sh"

  echo "Starting Keycloak container..."
  docker run -d \
    --name "$KEYCLOAK_CONTAINER" \
    -p "${KEYCLOAK_PORT}:8443" \
    -e KEYCLOAK_ADMIN=admin \
    -e KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PW" \
    -e KC_HEALTH_ENABLED=true \
    -e KEYCLOAK_HOST_PORT="${KEYCLOAK_PORT}" \
    -v "$SECRETS_DIR/realm.json:/opt/keycloak/data/import/realm.json" \
    -v "$SECRETS_DIR/keycloak-start.sh:/startup.sh" \
    --entrypoint /bin/bash \
    "$KEYCLOAK_IMAGE" \
    /startup.sh

  echo "Waiting for Keycloak to start (this takes ~30s)..."
  deadline=$(( $(date +%s) + 120 ))
  until docker logs "$KEYCLOAK_CONTAINER" 2>&1 | grep -q 'Running the server in development mode'; do
    [[ $(date +%s) -gt $deadline ]] && { echo "Timed out waiting for Keycloak"; exit 1; }
    sleep 2
  done
  echo "Keycloak is up."
else
  echo "Keycloak container '$KEYCLOAK_CONTAINER' already running — skipping start."
fi

# ---------------------------------------------------------------------------
# 2. Extract the self-signed certificate (needed for Node.js to trust it)
# ---------------------------------------------------------------------------

if [[ ! -f "$CERT_FILE" ]]; then
  echo "Extracting Keycloak CA certificate..."
  deadline=$(( $(date +%s) + 30 ))
  until docker exec "$KEYCLOAK_CONTAINER" cat /tmp/keycloak-ca.pem 2>/dev/null | grep -q 'BEGIN CERTIFICATE'; do
    [[ $(date +%s) -gt $deadline ]] && { echo "Timed out waiting for Keycloak certificate"; exit 1; }
    sleep 1
  done
  docker exec "$KEYCLOAK_CONTAINER" cat /tmp/keycloak-ca.pem > "$CERT_FILE"
  chmod 600 "$CERT_FILE"
  echo "Certificate saved to $CERT_FILE"
fi

# ---------------------------------------------------------------------------
# 3. Write oidc-config.json (only if it doesn't exist yet)
# ---------------------------------------------------------------------------

if [[ ! -f "$OIDC_CONFIG_FILE" ]]; then
  cat > "$OIDC_CONFIG_FILE" <<JSON
{
  "clientId": "$CLIENT_ID",
  "clientSecret": "$CLIENT_SECRET",
  "discoveryEndpoint": "https://localhost:${KEYCLOAK_PORT}/realms/${REALM_NAME}/.well-known/openid-configuration",
  "loginEnabled": true,
  "prompt": "select_account",
  "authenticationContextClassReference": []
}
JSON
  chmod 600 "$OIDC_CONFIG_FILE"
  echo "Created OIDC config at $OIDC_CONFIG_FILE"
fi

# ---------------------------------------------------------------------------
# 4. Delete previous n8n data to simulate a fresh boot
# ---------------------------------------------------------------------------

if [[ -d "/Users/ireneeajeneza/.n8n" ]]; then
  echo "Deleting /Users/ireneeajeneza/.n8n"
  rm -rf "/Users/ireneeajeneza/.n8n"
fi

# ---------------------------------------------------------------------------
# 5. Start n8n — NODE_EXTRA_CA_CERTS tells Node.js to trust Keycloak's cert
# ---------------------------------------------------------------------------

pushd "$SCRIPT_DIR/../../packages/cli" > /dev/null

N8N_LOG_LEVEL=debug \
N8N_INIT_OWNER_EMAIL=owner@example.com \
N8N_INIT_OWNER_FIRST_NAME=Jane \
N8N_INIT_OWNER_LAST_NAME=Doe \
N8N_INIT_OWNER_PASSWORD_FILE="$PASSWORD_FILE" \
N8N_LICENSE_TENANT_ID="$(read_secret license_tenant_id)" \
N8N_LICENSE_ACTIVATION_KEY="$(read_secret license_activation_key)" \
NODE_EXTRA_CA_CERTS="$CERT_FILE" \
N8N_INIT_SSO_OIDC_CONFIG_FILE="$OIDC_CONFIG_FILE" \
pnpm dev
