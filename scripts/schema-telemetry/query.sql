-- Output schemas that n8n Cloud recorded after manual executions, grouped by
-- node type, version, resource, operation and simplify flag. Returns up to
-- @samples schemas per group, one per workflow, for groups seen in at least
-- @min_workflows workflows. Filter on _PARTITIONDATE: a filter on `timestamp`
-- scans the whole table (about 850 GB).
WITH nodes AS (
  SELECT
    workflow_id,
    JSON_VALUE(node, '$.type') AS node_type,
    JSON_VALUE(node, '$.typeVersion') AS node_version,
    JSON_VALUE(node, '$.parameters.resource') AS resource,
    JSON_VALUE(node, '$.parameters.operation') AS operation,
    CASE
      WHEN JSON_VALUE(node, '$.parameters.simplify') IS NOT NULL THEN 'simplify'
      WHEN JSON_VALUE(node, '$.parameters.simple') IS NOT NULL THEN 'simple'
      WHEN JSON_VALUE(node, '$.parameters.simplifyOutput') IS NOT NULL THEN 'simplifyOutput'
      WHEN JSON_VALUE(node, '$.parameters.options.simplify') IS NOT NULL THEN 'options.simplify'
      WHEN JSON_VALUE(node, '$.parameters.options.simple') IS NOT NULL THEN 'options.simple'
      WHEN JSON_VALUE(node, '$.parameters.options.simplifyOutput') IS NOT NULL THEN 'options.simplifyOutput'
    END AS simplify_param,
    COALESCE(
      JSON_VALUE(node, '$.parameters.simplify'),
      JSON_VALUE(node, '$.parameters.simple'),
      JSON_VALUE(node, '$.parameters.simplifyOutput'),
      JSON_VALUE(node, '$.parameters.options.simplify'),
      JSON_VALUE(node, '$.parameters.options.simple'),
      JSON_VALUE(node, '$.parameters.options.simplifyOutput')) AS simplify,
    JSON_QUERY(node, '$.outputSchema') AS output_schema,
    -- These settings put error items into the first output, which the event records.
    COALESCE(JSON_VALUE(node, '$.settings.continueOnFail'), 'false') = 'true'
      OR JSON_VALUE(node, '$.settings.onError') = 'continueRegularOutput' AS errors_in_output
  FROM `n8n-telemetry.rudder_cloud_be_hooks.workflow_executed_manually_with_output_schema`,
    UNNEST(JSON_QUERY_ARRAY(nodes_schema)) AS node
  WHERE _PARTITIONDATE >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
),
one_per_workflow AS (
  SELECT * EXCEPT (rn, errors_in_output) FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY node_type, node_version, resource, operation, simplify_param, simplify, workflow_id
      ORDER BY FARM_FINGERPRINT(output_schema)
    ) AS rn
    FROM nodes
    WHERE node_type IS NOT NULL
      AND output_schema IS NOT NULL
      AND NOT COALESCE(errors_in_output, FALSE)
      AND (STARTS_WITH(node_type, 'n8n-nodes-base.') OR STARTS_WITH(node_type, '@n8n/n8n-nodes-langchain.'))
      AND NOT ENDS_WITH(node_type, 'Tool')
      AND COALESCE(operation, '') != '__CUSTOM_API_CALL__'
  )
  WHERE rn = 1
)
SELECT
  node_type, node_version, resource, operation, simplify_param, simplify,
  COUNT(*) AS workflows,
  ARRAY_AGG(output_schema ORDER BY FARM_FINGERPRINT(workflow_id) LIMIT @samples) AS samples
FROM one_per_workflow
GROUP BY node_type, node_version, resource, operation, simplify_param, simplify
HAVING workflows >= @min_workflows
