# shellcheck shell=bash
# cycle-upgrade.sh — MODE=upgrade: one full upgrade cycle on one backend.
#   P1 seed on the old release -> P2 upgrade (flag off) -> P3 downgrade-read
#   -> P4 write-on + rotate.
# Sourced by encryption-cycle.sh; not executable on its own.

run_cycle() {
  init_backend "$1"

  local SECRET_A="up-A-$(date +%s)-$RANDOM" SECRET_B="up-B-$(date +%s)-$RANDOM"
  local SECRET_C="up-C-$(date +%s)-$RANDOM" SECRET_D="up-D-$(date +%s)-$RANDOM"

  phase "P1 seed"
  step "seeding on the old release ($FROM_IMAGE)"
  start_container
  wait_ready
  local from_version
  from_version="$(docker exec "$CONTAINER" n8n --version 2>/dev/null | tail -1 || echo '?')"
  step "FROM version: $from_version"
  create_owner
  step "creating credential A (the seed data)"
  local cred_a cred_b cred_c cred_d
  cred_a="$(create_credential "upgrade-test cred A (seeded on FROM)" "$SECRET_A")" || fail "create credential A"
  ok "credential A = $cred_a"
  assert_decrypts "$cred_a" "$SECRET_A" "baseline on FROM"
  stop_container
  wait_gone

  phase "P2 upgrade"
  step "upgrading to this checkout, rotation flag OFF"
  start_local off
  wait_ready
  login
  assert_decrypts "$cred_a" "$SECRET_A" "old data survives the upgrade"
  step "creating credential B on the upgraded instance"
  cred_b="$(create_credential "upgrade-test cred B (written on TO, flag off)" "$SECRET_B")" || fail "create credential B"
  ok "credential B = $cred_b"
  step "checking B is stored in the LEGACY format (flag off => byte-compatible writes)"
  local raw_b
  raw_b="$(raw_value "$cred_b")"
  case "$raw_b" in
    U2FsdGVkX1*) ok "credential B stored in legacy format (U2FsdGVkX1...)";;
    *) echo "raw value (first 60): $(printf '%s' "$raw_b" | head -c 60)"
       fail "flag OFF but new write is not legacy-format";;
  esac
  assert_decrypts "$cred_b" "$SECRET_B" "fresh write on TO"
  step "checking the key store got seeded (exactly 2 deployment_key rows)"
  local key_rows
  key_rows="$(db_query "SELECT COUNT(*) FROM deployment_key WHERE type='data_encryption';")"
  [ "$key_rows" = "2" ] || fail "expected exactly 2 seeded deployment_key rows, got $key_rows"
  ok "deployment_key has exactly 2 rows"
  stop_local
  wait_gone

  phase "P3 downgrade"
  step "booting the old release on the upgraded data"
  start_container
  wait_ready
  login
  assert_decrypts "$cred_b" "$SECRET_B" "value written by the NEWER instance reads on the OLDER one"
  assert_decrypts "$cred_a" "$SECRET_A" "original data still fine on FROM"
  stop_container
  wait_gone

  phase "P4 write-on"
  step "booting this checkout with the rotation flag ON"
  start_local on
  wait_ready
  login
  assert_decrypts "$cred_a" "$SECRET_A" "mixed: seeded on FROM"
  assert_decrypts "$cred_b" "$SECRET_B" "mixed: legacy written on TO"
  step "reading the active data-encryption key id"
  local active_key_id
  active_key_id="$(get_active_key_id)"
  [ -n "$active_key_id" ] || fail "no active aes-256-gcm deployment_key row"
  ok "active key id: $active_key_id"
  step "creating credential C (must be keyId-prefixed)"
  cred_c="$(create_credential "upgrade-test cred C (flag on)" "$SECRET_C")" || fail "create credential C"
  assert_prefixed "$cred_c" "$active_key_id" "flag-on write"
  assert_decrypts "$cred_c" "$SECRET_C" "prefixed write"
  step "rotating the key via POST /rest/encryption/keys"
  local new_key_id
  new_key_id="$(rotate_key "$active_key_id")" || fail "key rotation via API did not produce a new key id"
  ok "rotated: $active_key_id -> $new_key_id"
  step "creating credential D (must use the NEW key id)"
  cred_d="$(create_credential "upgrade-test cred D (after rotate)" "$SECRET_D")" || fail "create credential D"
  assert_prefixed "$cred_d" "$new_key_id" "write after rotation"
  step "final sweep: all four generations must decrypt"
  local pair
  for pair in "$cred_a:$SECRET_A" "$cred_b:$SECRET_B" "$cred_c:$SECRET_C" "$cred_d:$SECRET_D"; do
    assert_decrypts "${pair%%:*}" "${pair#*:}" "all generations"
  done
  stop_local
  wait_gone

  teardown_backend
  summary
  echo
  echo "[$(date +%H:%M:%S)] PASS [$BACKEND]: seed($from_version) -> upgrade(read) -> downgrade-read -> write-on+rotate, all decrypts OK"
}
