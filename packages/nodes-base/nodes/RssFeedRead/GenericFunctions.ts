import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IPollFunctions,
} from 'n8n-workflow';
import { sanitizeXmlName } from 'n8n-workflow';
import Parser from 'rss-parser';

const DEFAULT_HEADERS = {
	'User-Agent': 'rss-parser',
	Accept: 'application/rss+xml',
};

const RELAXED_ACCEPT_HEADER =
	'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4';

/**
 * HTTP status codes (and the transient failure classes behind them) that should
 * not block publishing a workflow version that contains an RSS Feed Trigger.
 *
 * A 429 (rate limited) or a 5xx (upstream/server error) is usually temporary:
 * the operator can publish a corrected version (e.g. a longer poll interval) to
 * make it recover on the next poll, but only if we let the version through. We
 * therefore treat these as best-effort — the poll is skipped and the trigger is
 * allowed to register so the fix can ship.
 *
 * By contrast, a 4xx (other than 429) means the feed is genuinely broken or
 * unauthorized, and an unparseable response / connection failure means the host
 * is wrong — those must still surface as a clear error.
 */
const TRANSIENT_FEED_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Returns true when `error` represents a transient feed-fetch failure that
 * should not block publishing a workflow version with an RSS Feed Trigger.
 *
 * Handles both the raw `AxiosError`/`NodeApiError` shapes (where the status lives
 * on `error.response.status` or `error.httpCode`) and the `NodeApiError` thrown by
 * `helpers.httpRequest`, which exposes the status via `error.httpCode`.
 */
export function feedFetchFailedTransiently(error: unknown): boolean {
	if (error === null || typeof error !== 'object') return false;

	const maybeStatus =
		(error as { response?: { status?: unknown } }).response?.status ??
		(error as { httpCode?: unknown }).httpCode ??
		(error as { statusCode?: unknown }).statusCode;

	if (typeof maybeStatus === 'string' || typeof maybeStatus === 'number') {
		const status = Number(maybeStatus);
		if (TRANSIENT_FEED_HTTP_STATUSES.has(status)) return true;
	}

	return false;
}

type RequestHelpers = IExecuteFunctions['helpers'] | IPollFunctions['helpers'];

export async function parseFeedUrl(
	helpers: RequestHelpers,
	feedUrl: string,
	options: {
		customFields?: string;
		ignoreSSL?: boolean;
		useRelaxedAcceptHeader?: boolean;
	} = {},
): Promise<Parser.Output<IDataObject>> {
	const headers = {
		...DEFAULT_HEADERS,
		...(options.useRelaxedAcceptHeader ? { Accept: RELAXED_ACCEPT_HEADER } : {}),
	};

	const requestOptions: IHttpRequestOptions = {
		method: 'GET',
		url: feedUrl,
		headers,
		json: false,
		encoding: 'text',
		skipSslCertificateValidation: options.ignoreSSL,
	};

	const feedXmlResponse = await helpers.httpRequest(requestOptions);
	const feedXml = typeof feedXmlResponse === 'string' ? feedXmlResponse : String(feedXmlResponse);

	const parserOptions: Parser.ParserOptions<IDataObject, IDataObject> = {
		xml2js: {
			tagNameProcessors: [sanitizeXmlName],
			attrNameProcessors: [sanitizeXmlName],
		},
		...(options.customFields
			? {
					customFields: {
						item: options.customFields.split(',').map((field) => field.trim()),
					},
				}
			: {}),
	};

	const parser = new Parser(parserOptions);

	return await parser.parseString(feedXml);
}
