-- Live view of the PoC trigger-service state. Tables exist once the PoC
-- migration (task 0.2) has run; until then this errors harmlessly.
\pset footer off
\echo '=== trigger_worker (heartbeats) ==='
SELECT "workerId",
       to_char("lastHeartbeatAt", 'HH24:MI:SS') AS last_beat,
       round(extract(epoch FROM now() - "lastHeartbeatAt")) AS age_s
FROM trigger_worker
ORDER BY "workerId";

\echo ''
\echo '=== workflow_trigger_lease ==='
SELECT "workflowId", "nodeId", "desiredState", "actualState",
       coalesce("holderId", '-') AS holder,
       to_char("updatedAt", 'HH24:MI:SS') AS updated
FROM workflow_trigger_lease
ORDER BY "workflowId", "nodeId";

\echo ''
\echo '=== workflow_publication_outbox (non-terminal) ==='
SELECT id, "workflowId", "publishedVersionId", status,
       to_char("updatedAt", 'HH24:MI:SS') AS updated
FROM workflow_publication_outbox
WHERE status IN ('pending', 'in_progress')
ORDER BY id;
