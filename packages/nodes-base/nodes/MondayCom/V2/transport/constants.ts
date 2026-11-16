/**
 * The monday.com API version this node is pinned to — the single source of
 * truth for every request (client header and credential test).
 *
 * Upgrade policy:
 * - monday releases quarterly (yyyy-01 / 04 / 07 / 10). Each version is
 *   "current" for one quarter, then supported in maintenance for ~1 year.
 * - Review this constant once per quarter against
 *   `query { versions { kind value } }` and bump, after running the full
 *   e2e suite against the new version.
 * - Product decision 2026-07-19 (PM): pin the 2026-10 release candidate as
 *   the default — it removes the deprecated User fields and carries the
 *   newer surfaces (run_prompt, use_template, user activity logs). Use
 *   2027-01 per-request only where an operation needs it; never pin "dev".
 *
 * Last reviewed: 2026-07-19 (verified against the live API).
 */
export const MONDAY_API_VERSION = '2026-10';

export const MONDAY_API_URL = 'https://api.monday.com/v2';

/** Dedicated endpoint for multipart file-upload mutations (add_file_to_column etc.). */
export const MONDAY_FILE_API_URL = 'https://api.monday.com/v2/file';

/**
 * Default record cap for every Get Many operation. Node-wide convention:
 * Limit lives inside the Options collection (never a required top-level
 * parameter) and this default applies unless the user sets it explicitly.
 */
export const DEFAULT_LIMIT = 50;

/**
 * Pre-signed URLs handed back by the API (bulk-import upload_url and
 * report_url) are only followed when they are https and their hostname ends
 * with one of these suffixes. Per monday's storage team (2026-10) the URLs
 * are either raw S3 presigns (`<bucket>.s3.<region>.amazonaws.com`) or
 * CloudFront rewrites (`bulk-import-<region>.monday.com`); regions and
 * hosts change over time, so the list is deliberately loose.
 */
export const PRESIGNED_URL_ALLOWED_HOST_SUFFIXES: readonly string[] = [
	'monday.com',
	'amazonaws.com',
];

/** User-Agent on every authenticated monday.com API request from this node. */
export const MONDAY_USER_AGENT = 'n8n-monday';

/** Base request headers for monday.com API calls (merges with operation-specific headers). */
export function mondayRequestHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return {
		'User-Agent': MONDAY_USER_AGENT,
		...extra,
	};
}
