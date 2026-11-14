/**
 * Catalog queries shared by the resource locator pickers in `methods/listSearch.ts` and the
 * List Schemas and List Tables operations, so both see exactly the same rows.
 */

export const LIST_SCHEMAS_QUERY =
	'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name';

export const LIST_TABLES_QUERY =
	'SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name';
