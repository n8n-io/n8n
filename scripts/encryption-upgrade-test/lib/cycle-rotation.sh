# shellcheck shell=bash
# cycle-rotation.sh — MODE=rotation: the standalone DB-stored key rotation
# test on one backend, this checkout only, fresh database, flag ON.
#   R1 seed -> R2 rotate x2 -> R3 restart-read.
# Sourced by encryption-cycle.sh; not executable on its own.

run_rotation() {
  init_backend "$1"

  local SECRET_A="rot-A-$(date +%s)-$RANDOM" SECRET_B="rot-B-$(date +%s)-$RANDOM"
  local SECRET_C="rot-C-$(date +%s)-$RANDOM" SECRET_D="rot-D-$(date +%s)-$RANDOM"

  phase "R1 seed"
  step "booting this checkout on a fresh database, rotation flag ON"
  start_local on
  wait_ready
  create_owner
  step "checking the key store got seeded (exactly 2 deployment_key rows)"
  local key_rows
  key_rows="$(db_query "SELECT COUNT(*) FROM deployment_key WHERE type='data_encryption';")"
  [ "$key_rows" = "2" ] || fail "expected exactly 2 seeded deployment_key rows, got $key_rows"
  ok "deployment_key has exactly 2 rows"
  local key1
  key1="$(get_active_key_id)"
  [ -n "$key1" ] || fail "no active aes-256-gcm deployment_key row"
  ok "active key id: $key1"
  step "creating credential A (must be keyId-prefixed)"
  local cred_a cred_b cred_c cred_d
  cred_a="$(create_credential "rotation-test cred A (initial key)" "$SECRET_A")" || fail "create credential A"
  assert_prefixed "$cred_a" "$key1" "first write"
  assert_decrypts "$cred_a" "$SECRET_A" "first write"

  phase "R2 rotate"
  step "first rotation via POST /rest/encryption/keys"
  local key2
  key2="$(rotate_key "$key1")" || fail "first rotation did not produce a new key id"
  ok "rotated: $key1 -> $key2"
  step "creating credential B (must use the NEW key id)"
  cred_b="$(create_credential "rotation-test cred B (after 1st rotate)" "$SECRET_B")" || fail "create credential B"
  assert_prefixed "$cred_b" "$key2" "write after the 1st rotation"
  assert_decrypts "$cred_b" "$SECRET_B" "write after the 1st rotation"
  step "second rotation via POST /rest/encryption/keys"
  local key3
  key3="$(rotate_key "$key2")" || fail "second rotation did not produce a new key id"
  ok "rotated: $key2 -> $key3"
  step "creating credential C (must use the NEWEST key id)"
  cred_c="$(create_credential "rotation-test cred C (after 2nd rotate)" "$SECRET_C")" || fail "create credential C"
  assert_prefixed "$cred_c" "$key3" "write after the 2nd rotation"
  assert_decrypts "$cred_c" "$SECRET_C" "write after the 2nd rotation"
  step "checking the key store keeps every generation (4 rows, exactly 1 active)"
  key_rows="$(db_query "SELECT COUNT(*) FROM deployment_key WHERE type='data_encryption';")"
  [ "$key_rows" = "4" ] || fail "expected 4 deployment_key rows after 2 rotations, got $key_rows"
  local active_rows
  active_rows="$(db_query "SELECT COUNT(*) FROM deployment_key WHERE type='data_encryption' AND status='active' AND algorithm='aes-256-gcm';")"
  [ "$active_rows" = "1" ] || fail "expected exactly 1 active key, got $active_rows"
  ok "4 key rows kept, exactly 1 active"

  phase "R3 restart"
  step "restarting the instance (keys must reload from the database)"
  stop_local
  wait_gone
  start_local on
  wait_ready
  login
  step "creating credential D (the restarted instance must keep writing with the active key)"
  cred_d="$(create_credential "rotation-test cred D (after restart)" "$SECRET_D")" || fail "create credential D"
  assert_prefixed "$cred_d" "$key3" "write after the restart"
  step "final sweep: every generation must decrypt after the restart"
  local pair
  for pair in "$cred_a:$SECRET_A" "$cred_b:$SECRET_B" "$cred_c:$SECRET_C" "$cred_d:$SECRET_D"; do
    assert_decrypts "${pair%%:*}" "${pair#*:}" "all generations"
  done
  stop_local
  wait_gone

  teardown_backend
  summary
  echo
  echo "[$(date +%H:%M:%S)] PASS [$BACKEND]: seed(flag on) -> rotate x2 -> restart-read, all decrypts OK"
}
