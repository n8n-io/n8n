type MappedError = {
	message: string;
	description: string;
};

type GraphErrorShape = { code?: unknown; message?: unknown };

// Graph error codes that indicate an auth/permission failure, used as a fallback
// when the HTTP status code isn't present on the thrown error.
const AUTH_ERROR_CODES = [
	'accessdenied',
	'unauthenticated',
	'invalidauthenticationtoken',
	'authorization_requestdenied',
];

/**
 * Pull the structured Microsoft Graph error `{ code, message }` out of the thrown
 * error. Graph returns `{ error: { code, message } }` and n8n attaches the parsed
 * body on the error's `error` property, so the Graph object can sit at
 * `error.error.error`, `error.error`, or the top level. Only these structured fields
 * are read, never a free-text dump of the whole error, so an arbitrary value such as
 * a workbook filename can never leak into the matching.
 */
function readGraphError(error: unknown): { code: string; message: string } {
	const toLower = (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : '');
	const err = error as { error?: { error?: GraphErrorShape } & GraphErrorShape } & GraphErrorShape;

	const candidates: Array<GraphErrorShape | undefined> = [err?.error?.error, err?.error, err];
	for (const candidate of candidates) {
		if (
			candidate &&
			(typeof candidate.code === 'string' || typeof candidate.message === 'string')
		) {
			return { code: toLower(candidate.code), message: toLower(candidate.message) };
		}
	}
	return { code: '', message: '' };
}

/**
 * Translate the most common Microsoft Graph auth failures into clear, actionable
 * messages. Without this, a missing-permission or licensing problem surfaces as a
 * generic API error (or, for listings, a silently empty result), which gives the
 * user nothing to act on.
 *
 * Only genuine auth failures are mapped: an HTTP 401/403, or a Graph auth error code.
 * Everything else (404, 400, throttling, network errors) returns `undefined` so the
 * caller falls back to the default `NodeApiError`. Matching keys off the status and
 * the structured error fields rather than the error text, so an unrelated failure
 * that merely mentions "license" (e.g. a 404 for a workbook named "License.xlsx") is
 * never mislabelled.
 */
export function mapMicrosoftApiError(error: unknown): MappedError | undefined {
	const err = error as { statusCode?: number; httpCode?: number | string };
	const status = Number(err?.statusCode ?? err?.httpCode);
	const { code, message } = readGraphError(error);

	const isAuthFailure = status === 401 || status === 403 || AUTH_ERROR_CODES.includes(code);
	if (!isAuthFailure) return undefined;

	if (message.includes('license')) {
		return {
			message: 'This Microsoft 365 account is missing a required license',
			description:
				'Listing or opening these workbooks needs a license that includes SharePoint/OneDrive for this account. Ask your Microsoft 365 administrator to assign one, then try again.',
		};
	}

	return {
		message: 'The connected Microsoft account is missing the required permissions',
		description:
			'Reconnect this credential to grant access to shared and SharePoint files. The Excel node now needs the Files.ReadWrite.All permission, which a Microsoft 365 administrator may have to consent to.',
	};
}
