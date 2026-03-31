#!/usr/bin/env bash
set -euo pipefail

# Recipe: SAML Provider Config Seeding (Phase 3)
#
# Seeds SAML config on first boot via N8N_INIT_SSO_SAML_CONFIG_FILE.
# loginEnabled defaults to false — flip it via the UI or toggle API after
# verifying IdP connectivity.

# Delete previous n8n data directory to simulate a fresh boot.
if [[ -d "/Users/ireneeajeneza/.n8n" ]]; then
  echo "Deleting /Users/ireneeajeneza/.n8n"
  rm -rf "/Users/ireneeajeneza/.n8n"
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

PASSWORD_FILE="$SECRETS_DIR/owner_password"
SAML_CONFIG_FILE="$SECRETS_DIR/saml-config.json"

# Create example SAML config if it doesn't exist.
if [[ ! -f "$SAML_CONFIG_FILE" ]]; then
  cat > "$SAML_CONFIG_FILE" <<'JSON'
{
  "metadata": "",
  "metadataUrl": "https://idp.example.com/saml/metadata",
  "loginEnabled": false,
  "loginLabel": "SSO",
  "ignoreSSL": false,
  "loginBinding": "redirect",
  "acsBinding": "post",
  "authnRequestsSigned": false,
  "wantAssertionsSigned": true,
  "wantMessageSigned": true,
  "mapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
    "userPrincipalName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"
  }
}
JSON
  chmod 600 "$SAML_CONFIG_FILE"
  echo "Created example SAML config at $SAML_CONFIG_FILE — edit before using."
fi

pushd "$SCRIPT_DIR/../../packages/cli" > /dev/null

N8N_LOG_LEVEL=debug \
N8N_INIT_OWNER_EMAIL=owner@example.com \
N8N_INIT_OWNER_FIRST_NAME=Jane \
N8N_INIT_OWNER_LAST_NAME=Doe \
N8N_INIT_OWNER_PASSWORD_FILE="$PASSWORD_FILE" \
N8N_LICENSE_TENANT_ID="$(read_secret license_tenant_id)" \
N8N_LICENSE_ACTIVATION_KEY="$(read_secret license_activation_key)" \
N8N_INIT_SSO_SAML_CONFIG_FILE="$SAML_CONFIG_FILE" \
pnpm dev
