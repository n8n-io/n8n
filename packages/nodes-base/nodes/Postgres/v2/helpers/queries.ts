/**
 * Catalog queries shared by the resource locator pickers in `methods/listSearch.ts` and the
 * List Schemas and List Tables operations, so both see exactly the same rows.
 */

// information_schema.schemata does not list every schema the role can read, so this is worded
// against what the Schema picker shows rather than what the connection can reach.
export const LIST_SCHEMAS_QUERY =
	'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name';

// information_schema.tables also lists views and foreign tables, so `table_type` says what each
// row is. A child partition still reports BASE TABLE. The Table picker ignores the extra column.
export const LIST_TABLES_QUERY =
	'SELECT table_name, table_type FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name';
