/**
 * Query languages differ in how a literal quote is written, so pick the helper
 * by language rather than by what looks familiar.
 *
 * Values are `unknown` and coerced here: a node parameter can resolve to a
 * number, boolean or null through an expression, and `as string` at the call
 * site would not convert it.
 */

/**
 * Escapes a value for a single-quoted literal in an OData `$filter`
 * (Microsoft Graph, SharePoint), where a literal quote is written twice.
 *
 * @see https://learn.microsoft.com/en-us/graph/filter-query-parameter
 */
export function escapeODataValue(value: unknown): string {
	return String(value).replaceAll("'", "''");
}
