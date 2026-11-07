import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// Maximum number of ETag entries retained in workflow static data. Bounds the
// growth of the conditional-request cache for workflows that read many
// different resources over their lifetime.
const ETAG_CACHE_LIMIT = 100;

// Per-entry and total byte budgets for the conditional-request cache. Entry
// count alone does not bound memory (or the size of the persisted static data),
// so a single large response — or many medium ones — could still grow it
// without limit. A body larger than the per-entry budget is not cached at all;
// the total budget evicts oldest entries until the cache fits.
const ETAG_CACHE_MAX_ENTRY_BYTES = 1024 * 1024; // 1 MiB
const ETAG_CACHE_MAX_TOTAL_BYTES = 8 * 1024 * 1024; // 8 MiB

interface GithubEtagEntry {
	etag: string;
	body: unknown;
	// Optional so eviction stays correct if a future entry shape omits it; every
	// entry written here records it (this PR introduces the cache, so no persisted
	// entry is missing it today).
	bytes?: number;
}

// Approximate serialized size of a cache entry. The body is measured as UTF-8
// JSON since that is how it is persisted in workflow static data; a body that
// cannot be serialized (e.g. a circular structure) is treated as zero so it
// still counts against the entry-count limit without breaking the request.
function etagEntryBytes(etag: string, body: unknown): number {
	let bodyBytes = 0;
	try {
		bodyBytes = Buffer.byteLength(JSON.stringify(body) ?? '', 'utf8');
	} catch {
		bodyBytes = 0;
	}
	return bodyBytes + Buffer.byteLength(etag, 'utf8');
}

// Size of a cache entry. Every entry this revision writes carries `bytes`, so
// the fast path returns it directly. The fallback is forward compatibility only:
// workflow static data outlives n8n upgrades, so a future change to the entry
// shape could leave `bytes` undefined — recomputing from etag+body keeps the
// running total finite (a stray undefined would make it NaN and silently disable
// the byte budget) rather than depending on a not-yet-existing migration.
function entryBytes(entry: GithubEtagEntry): number {
	return typeof entry.bytes === 'number' && Number.isFinite(entry.bytes)
		? entry.bytes
		: etagEntryBytes(entry.etag, entry.body);
}

// Evict oldest entries until the cache is within both the entry-count and
// total-byte budgets. Eviction is deliberately by insertion order (first write),
// not last use: a 304 returns the cached body without re-inserting the entry, so
// a steadily-revalidating entry keeps its original position. This bounds memory
// simply; last-use ordering is not needed for the poll-heavy workloads this cache
// targets.
function evictEtagCache(cache: Record<string, GithubEtagEntry>): void {
	const keys = Object.keys(cache);
	let total = 0;
	for (const key of keys) {
		total += entryBytes(cache[key]);
	}
	let index = 0;
	while (
		index < keys.length &&
		(keys.length - index > ETAG_CACHE_LIMIT || total > ETAG_CACHE_MAX_TOTAL_BYTES)
	) {
		const oldest = keys[index];
		total -= entryBytes(cache[oldest]);
		delete cache[oldest];
		index++;
	}
}

function conditionalRequestKey(credentialType: string, uri: string, qs?: IDataObject): string {
	const sortedQs = qs
		? Object.keys(qs)
				.sort()
				.reduce<IDataObject>((acc, key) => {
					acc[key] = qs[key];
					return acc;
				}, {})
		: {};
	return `${credentialType} ${uri} ${JSON.stringify(sortedQs)}`;
}

/**
 * Make an API request to Github
 *
 */
export async function githubApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	option: IDataObject = {},
): Promise<any> {
	// `conditionalRequest` is an internal flag (not a request option) that opts a
	// GET into ETag / If-None-Match revalidation. It is stripped before the
	// remaining options are forwarded to the HTTP client.
	const useConditionalRequest = method === 'GET' && option.conditionalRequest === true;
	const requestOption = { ...option };
	delete requestOption.conditionalRequest;

	const options: IRequestOptions = {
		method,
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (Object.keys(requestOption).length !== 0) {
		Object.assign(options, requestOption);
	}

	try {
		const authenticationMethod = this.getNodeParameter(
			'authentication',
			0,
			'accessToken',
		) as string;
		let credentialType = '';

		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('githubApi');
			credentialType = 'githubApi';

			const baseUrl = credentials.server || 'https://api.github.com';
			options.uri = `${baseUrl}${endpoint}`;
		} else if (authenticationMethod === 'githubAppApi') {
			const credentials = await this.getCredentials('githubAppApi');
			credentialType = 'githubAppApi';

			const baseUrl = credentials.server || 'https://api.github.com';
			options.uri = `${baseUrl}${endpoint}`;
		} else {
			const credentials = await this.getCredentials('githubOAuth2Api');
			credentialType = 'githubOAuth2Api';

			const baseUrl = credentials.server || 'https://api.github.com';
			options.uri = `${baseUrl}${endpoint}`;
		}

		if (!useConditionalRequest) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}

		const staticData = this.getWorkflowStaticData('node');
		const cache =
			(staticData.githubEtagCache as unknown as Record<string, GithubEtagEntry>) ?? {};
		staticData.githubEtagCache = cache as unknown as IDataObject;

		const cacheKey = conditionalRequestKey(credentialType, options.uri, query);
		const cached = cache[cacheKey];

		// Ask the API to revalidate. A 304 Not Modified does not count against the
		// primary rate limit, so an unchanged resource is served from cache below.
		options.resolveWithFullResponse = true;
		options.simple = false;
		if (cached?.etag) {
			options.headers = {
				...(options.headers as IDataObject),
				'If-None-Match': cached.etag,
			};
		}

		const response = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
		);

		if (response.statusCode === 304 && cached) {
			return cached.body;
		}

		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw new NodeApiError(this.getNode(), {
				statusCode: response.statusCode,
				...(response.body as IDataObject),
			} as JsonObject);
		}

		const etag = (response.headers?.etag as string) ?? '';
		if (etag) {
			// Always drop any stale entry for this key first.
			delete cache[cacheKey];
			const bytes = etagEntryBytes(etag, response.body);
			// A body that on its own exceeds the per-entry budget is left uncached;
			// storing it would evict many smaller, more reusable entries for one
			// oversized result that is unlikely to revalidate cheaply.
			if (bytes <= ETAG_CACHE_MAX_ENTRY_BYTES) {
				cache[cacheKey] = { etag, body: response.body, bytes };
				evictEtagCache(cache);
			}
		}

		return response.body;
	} catch (error) {
		if (error instanceof NodeApiError) {
			throw error;
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Returns the SHA of the given file
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function getFileSha(
	this: IHookFunctions | IExecuteFunctions,
	owner: string,
	repository: string,
	filePath: string,
	branch?: string,
): Promise<any> {
	const query: IDataObject = {};
	if (branch !== undefined) {
		query.ref = branch;
	}

	const getEndpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
	const responseData = await githubApiRequest.call(this, 'GET', getEndpoint, {}, query);

	if (responseData.sha === undefined) {
		throw new NodeOperationError(this.getNode(), 'Could not get the SHA of the file.');
	}
	return responseData.sha;
}

export async function githubApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await githubApiRequest.call(this, method, endpoint, body as IDataObject, query, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (responseData.headers.link?.includes('next'));
	return returnData;
}

export function isBase64(content: string) {
	const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	return base64regex.test(content);
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
