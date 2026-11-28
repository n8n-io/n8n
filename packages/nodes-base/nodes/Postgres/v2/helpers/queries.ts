/**
 * Catalog queries shared by the resource locator pickers in `methods/listSearch.ts` and the
 * List Schemas and List Tables operations, so both see exactly the same rows.
 */

// information_schema.schemata shows the schemas the credential's user owns or holds a privilege
// on, not every schema in the database.
export const LIST_SCHEMAS_QUERY =
	'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name';

// information_schema.tables also lists views and foreign tables, so `table_type` says what each
// row is. A partitioned table and each of its partitions all report BASE TABLE, so both appear.
// The Table picker ignores the extra column.
export const LIST_TABLES_QUERY =
	'SELECT table_name, table_type FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name';
