-- Live view of the trigger-seats state. Tables exist once the seats
-- migration has run; until then this errors harmlessly.
\pset footer off
\echo '=== trigger_runner (heartbeats) ==='
SELECT "runnerId",
       to_char("lastHeartbeatAt", 'HH24:MI:SS') AS last_beat,
       round(extract(epoch FROM now() - "lastHeartbeatAt")) AS age_s
FROM trigger_runner
ORDER BY "runnerId";

\echo ''
\echo '=== workflow_trigger_seat ==='
SELECT id, "workflowId", "nodeId", "seatIndex" AS seat,
       "desiredState" AS want, coalesce("actualState", '-') AS actual,
       coalesce("holderId", '-') AS holder,
       "leaseEpoch" AS epoch,
       coalesce(to_char("leaseExpiresAt", 'HH24:MI:SS'), '-') AS lease_until,
       coalesce("desiredHolderId", '-') AS handoff_to,
       left("desiredVersionId", 8) AS want_ver,
       coalesce(left("actualVersionId", 8), '-') AS actual_ver
FROM workflow_trigger_seat
ORDER BY "workflowId", "nodeId", "seatIndex";

\echo ''
\echo '=== executions (last 60s) ==='
SELECT count(*) AS executions_last_60s,
       count(DISTINCT "deduplicationKey") AS distinct_dedup_keys
FROM execution_entity
WHERE "createdAt" > now() - interval '60 seconds';

\echo ''
\echo '=== workflow_publication_outbox (non-terminal) ==='
SELECT id, "workflowId", status,
       to_char("updatedAt", 'HH24:MI:SS') AS updated
FROM workflow_publication_outbox
WHERE status IN ('pending', 'in_progress')
ORDER BY id;
