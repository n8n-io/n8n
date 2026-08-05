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

interface GithubEtagEntry {
	etag: string;
	body: unknown;
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
			delete cache[cacheKey];
			cache[cacheKey] = { etag, body: response.body };
			const keys = Object.keys(cache);
			if (keys.length > ETAG_CACHE_LIMIT) {
				delete cache[keys[0]];
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
