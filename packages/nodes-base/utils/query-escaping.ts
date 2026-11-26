import { NodeOperationError, UserError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

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

/**
 * Backslashes are escaped first, otherwise a trailing backslash in the value
 * would consume the backslash we add and leave the quote unescaped.
 */
function escapeWithBackslash(value: unknown, quote: string): string {
	return String(value).replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
}

/**
 * Escapes a value for a single-quoted literal in a backslash-escaping query
 * language: SendGrid's SGQL and the Google Drive query language.
 *
 * @see https://www.twilio.com/docs/sendgrid/for-developers/sending-email/segmentation-query-language
 * @see https://developers.google.com/workspace/drive/api/guides/search-files
 */
export function escapeBackslashQuotedValue(value: unknown): string {
	return escapeWithBackslash(value, "'");
}

/**
 * Escapes a value for a single-quoted operand of an SGQL `LIKE` (SendGrid).
 *
 * `%` is a wildcard there, so a value carrying one has to double it to stay a
 * literal — otherwise a bound value can widen an exact lookup. `_` is left
 * alone: the reference documents no wildcard meaning for it, and it is common
 * in real addresses.
 *
 * @see https://www.twilio.com/docs/sendgrid/for-developers/sending-email/segmentation-query-language
 */
export function escapeSgqlLikeValue(value: unknown): string {
	return escapeWithBackslash(value, "'").replaceAll('%', '%%');
}

/**
 * Escapes a value for a double-quoted clause in a Microsoft Graph
 * **directory-object** `$search` (`/users`, `/groups`), where the documented
 * rule is to backslash-escape a quote or a backslash.
 *
 * Only that dialect. Graph's other `$search` surfaces differ — message search is
 * Exchange KQL, which documents no escape, so a value carrying the delimiter has
 * to be rejected instead (see `assertNoQueryDelimiters`).
 *
 * @see https://learn.microsoft.com/en-us/graph/search-query-parameter — "Use $search on directory object collections"
 */
export function escapeODataSearchValue(value: unknown): string {
	return escapeWithBackslash(value, '"');
}

/**
 * Escapes a value for a double-quoted operand of an Amazon Cognito `ListUsers`
 * filter, where a quote is backslash-escaped.
 *
 * @see https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html — "Quotation marks within the filter string must be escaped using the backslash (\) character"
 */
export function escapeCognitoFilterValue(value: unknown): string {
	return escapeWithBackslash(value, '"');
}

// Admits only the characters an OData datetime is made of, so a match carries
// nothing that could be read as anything but the operand.
const ODATA_DATE_TIME =
	/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Completes a conforming value that omits the time or the offset. Graph wants a
 * whole DateTimeOffset, and the picker only produces one, so a short value comes
 * from an expression, where it reads as UTC.
 *
 * Completed as text rather than re-parsed: `new Date('2024-01-31T09:00')` resolves
 * against the local zone, which would move the value into another day.
 */
function completeDateTimeOffset(text: string): string {
	if (!text.includes('T')) return `${text}T00:00:00Z`;
	if (/(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return text;
	return /T\d{2}:\d{2}$/.test(text) ? `${text}:00Z` : `${text}Z`;
}

/**
 * Returns a value for an *unquoted* OData datetime operand, `receivedDateTime ge …`.
 *
 * An unquoted operand has no delimiter to escape, so the value is held to the
 * literal grammar instead. A `dateTime` parameter is a UI control, not a runtime
 * guarantee: an expression can resolve one to any value.
 *
 * Accepts milliseconds since the epoch, which the calling fields document. A
 * value that already carries an offset passes through unchanged, so a datetime
 * that works today keeps the exact form the API already receives; one missing the
 * time or the offset is completed rather than refused.
 *
 * Checks the shape, not the calendar: an impossible date cannot break out of the
 * operand, so it is left for the API to reject.
 *
 * @see https://learn.microsoft.com/en-us/graph/filter-query-parameter
 */
export function toODataDateTimeLiteral(fieldName: string, value: unknown): string {
	if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
		const fromEpoch = new Date(Number(value));
		// An out-of-range number gives an invalid date, whose toISOString() throws.
		if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch.toISOString();
	}

	const text = String(value);
	if (ODATA_DATE_TIME.test(text)) return completeDateTimeOffset(text);

	throw new UserError(`'${fieldName}' must be a date`, {
		description: `The value "${text}" is not a date. Use an ISO 8601 date such as 2024-01-31T09:00:00Z, or the number of milliseconds since the epoch.`,
	});
}

/**
 * Rejects a value carrying a delimiter of a query language that offers no way to
 * escape it — ServiceNow encoded queries (`^` separates clauses) and the
 * Freshservice filter API (quotes in a filter value are
 * [a known upstream limitation](https://community.freshworks.dev/t/how-are-single-quotes-escaped-in-filter-query-string-values/5123)
 * with no workaround).
 *
 * Throws rather than dropping the delimiter, which would silently change what
 * the query matches.
 */
export function assertNoQueryDelimiters(
	this: { getNode(): INode },
	fieldName: string,
	value: unknown,
	delimiters: string[],
	itemIndex?: number,
): void {
	const text = String(value);
	const found = delimiters.find((delimiter) => text.includes(delimiter));
	if (found === undefined) return;

	// getNode() deep-copies the node, so it is resolved here rather than passed in
	// — this runs per item, and the common case never reaches this line.
	throw new NodeOperationError(this.getNode(), `'${fieldName}' cannot contain ${found}`, {
		itemIndex,
		description: `The service this node queries has no way to quote ${found} inside a value, so a value containing it cannot be looked up. Remove it from '${fieldName}'.`,
	});
}
