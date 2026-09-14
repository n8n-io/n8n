# shellcheck shell=bash
# api.sh — REST calls and the encryption assertions the cycles are made of.
# Sourced by encryption-cycle.sh; not executable on its own.

rest_call() { # METHOD PATH [JSON] -> "HTTP_CODE TIME_TOTAL_S", body in $OUT_FILE
  local method="$1" path="$2" payload="${3:-}"
  local -a args=(-s -o "$OUT_FILE" -w '%{http_code} %{time_total}' -X "$method"
    -H "browser-id: $BROWSER_ID" -b "$COOKIE_JAR" -c "$COOKIE_JAR")
  [ -n "$payload" ] && args+=(-H 'Content-Type: application/json' --data "$payload")
  curl "${args[@]}" "${BASE_URL}${path}"
}

json_get() { # PY_EXPR (parsed JSON available as `d`)
  python3 -c '
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
print(eval(sys.argv[2]))
' "$OUT_FILE" "$1"
}

login() { # fresh cookie for the current instance (field name differs by version)
  step "logging in as $OWNER_EMAIL"
  : >"$COOKIE_JAR"
  local res
  res="$(rest_call POST /rest/login \
    "{\"emailOrLdapLoginId\": \"$OWNER_EMAIL\", \"password\": \"$OWNER_PASSWORD\"}")"
  if [ "${res%% *}" != "200" ]; then
    res="$(rest_call POST /rest/login \
      "{\"email\": \"$OWNER_EMAIL\", \"password\": \"$OWNER_PASSWORD\"}")"
  fi
  [ "${res%% *}" = "200" ] || { echo "login response ($res): $(head -c 300 "$OUT_FILE")"; fail "login failed"; }
  ok "logged in"
}

create_owner() {
  step "creating the owner account"
  local res
  res="$(rest_call POST /rest/owner/setup \
    "{\"email\": \"$OWNER_EMAIL\", \"firstName\": \"Spec\", \"lastName\": \"Owner\", \"password\": \"$OWNER_PASSWORD\"}")"
  [ "${res%% *}" = "200" ] || { echo "owner setup ($res): $(head -c 300 "$OUT_FILE")"; fail "owner setup failed"; }
  ok "owner created"
}

create_credential() { # NAME SECRET -> prints credential id
  local res
  res="$(rest_call POST /rest/credentials \
    "{\"name\": \"$1\", \"type\": \"httpHeaderAuth\", \"data\": {\"name\": \"$2\", \"value\": \"spec-header-password\"}}")"
  [ "${res%% *}" = "200" ] || { echo "create credential ($res): $(head -c 300 "$OUT_FILE")" >&2; return 1; }
  json_get "d['data']['id']"
}

# The unique secret lives in the NON-password `name` field: the API returns it
# decrypted verbatim, while both fields sit in one encrypted blob — so the
# round-trip proves the stored value decrypts. The password-typed `value` field
# is redacted by the API, which itself only happens after a successful decrypt.
assert_decrypts() { # CRED_ID EXPECTED_SECRET LABEL
  step "checking decrypt of credential $1 ($3)"
  local res code time_s got
  res="$(rest_call GET "/rest/credentials/$1?includeData=true")"
  code="${res%% *}"; time_s="${res##* }"
  [ "$code" = "200" ] || { echo "get credential ($code): $(head -c 300 "$OUT_FILE")"; fail "$3: GET credential $1 returned $code"; }
  got="$(json_get "d['data']['data']['name']")"
  [ "$got" = "$2" ] || { echo "expected: $2"; echo "actual:   $got"; fail "$3: credential $1 did not decrypt to the seeded secret"; }
  metric decrypt_ms "$PHASE" "$(python3 -c "print(round(float('$time_s')*1000, 1))")"
  ok "credential $1 decrypts to the seeded secret (${time_s}s)"
}

raw_value() { # CRED_ID -> raw credentials_entity.data
  db_query "SELECT data FROM credentials_entity WHERE id='$1';"
}

get_active_key_id() { # -> id of the single active data-encryption key
  db_query "SELECT id FROM deployment_key WHERE type='data_encryption' AND status='active' AND algorithm='aes-256-gcm';"
}

assert_prefixed() { # CRED_ID KEY_ID LABEL — the raw column must start "KEY_ID:"
  local raw
  raw="$(raw_value "$1")"
  case "$raw" in
    "$2":*) ok "$3: value is prefixed with key id $2";;
    *) echo "expected prefix: $2:"; echo "raw (first 60): $(printf '%s' "$raw" | head -c 60)"
       fail "$3: value is not prefixed with the expected key id";;
  esac
}

rotate_key() { # OLD_KEY_ID -> prints the new key id; records rotate_ms
  local res code time_s new_id
  res="$(rest_call POST /rest/encryption/keys '{"type": "data_encryption"}')"
  code="${res%% *}"; time_s="${res##* }"
  [ "$code" = "200" ] || { echo "rotate ($code): $(head -c 300 "$OUT_FILE")" >&2; return 1; }
  metric rotate_ms "$PHASE" "$(python3 -c "print(round(float('$time_s')*1000, 1))")"
  new_id="$(json_get "d['data']['id']")"
  { [ -n "$new_id" ] && [ "$new_id" != "$1" ]; } || return 1
  echo "$new_id"
}
