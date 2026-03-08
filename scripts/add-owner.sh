#!/usr/bin/env bash
# Copilot-generated script (Raptor mini)
# Description: add or update a global owner user in an n8n SQLite database
# stored inside a Docker volume.  Intended for use after rebuilding the
# custom n8n Docker image so that the UI doesn't prompt for owner setup.
#
# Usage:
#   ./scripts/add-owner.sh [volume]
#
# Example:
#   ./scripts/add-owner.sh n8n-data
#
# If volume is omitted, defaults to "n8n-data".
#
# The script will:
#  1. generate a bcrypt hash for the supplied password using the n8n CLI
#     from the freshly built image ("n8n-nsolid" must already exist locally).
#  2. copy the database.sqlite file from the named volume to a temporary
#     file on the host
#  3. insert or replace a row in the `user` table with roleSlug='global:owner'
#     and a generated UUID if no ID already present
#  4. write the modified database back into the volume

set -euo pipefail

# Owner credentials (hardcoded for this environment)
EMAIL="techyactor15@gmail.com"
FIRST_NAME="Daniel"
LAST_NAME="Goldstein"
# Pre-hashed password (bcrypt) - escape $ for use in heredocs
HASH='$2a$10$wCe9RX.mP7RffewyC6vYEOzIbyyyZzWhjJYTpWdYRy2IKJnmKZ1U2'

# Volume name (defaults to n8n-data, can override via first argument)
VOLUME="${1:-n8n-data}"

# copy db out of the volume
TMPDB=$(mktemp -t n8ndb.XXXXXX.sqlite)
docker run --rm -v "$VOLUME":/data alpine sh -c 'cat /data/database.sqlite' >"$TMPDB"

# insert/replace owner row
OWNER_ID=$(uuidgen)

sqlite3 "$TMPDB" <<SQL
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
-- try to update existing owner first
UPDATE user
SET
  email='$EMAIL',
  firstName='$FIRST_NAME',
  lastName='$LAST_NAME',
  password='$HASH',
  settings='{"userActivated":true}',
  roleSlug='global:owner',
  updatedAt=datetime('now')
WHERE roleSlug='global:owner';

-- if no row updated, insert a new one
INSERT INTO user (id,email,firstName,lastName,password,settings,roleSlug,createdAt,updatedAt)
SELECT '$OWNER_ID','$EMAIL','$FIRST_NAME','$LAST_NAME','$HASH','{"userActivated":true}','global:owner',datetime('now'),datetime('now')
WHERE (SELECT changes() = 0);

COMMIT;
PRAGMA foreign_keys=ON;
SQL

# write db back into volume
docker run --rm -v "$VOLUME":/data -v "$TMPDB":/tmp/db.sqlite alpine sh -c 'cat /tmp/db.sqlite > /data/database.sqlite'

rm -f "$TMPDB"

echo "Owner record has been created/updated in volume '$VOLUME' (email=$EMAIL)"
