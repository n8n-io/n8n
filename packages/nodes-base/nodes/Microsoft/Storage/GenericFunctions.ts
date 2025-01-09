import type {
	JsonObject,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IRequestOptions,
	INodeExecutionData,
	IN8nHttpFullResponse,
	INodeListSearchResult,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { parseString } from 'xml2js';

import { compareHeader } from './compare-header';

export const HeaderConstants = {
	AUTHORIZATION: 'Authorization',
	// AUTHORIZATION_SCHEME: 'Bearer',
	CONTENT_ENCODING: 'Content-Encoding',
	// CONTENT_ID: 'Content-ID',
	CONTENT_LANGUAGE: 'Content-Language',
	CONTENT_LENGTH: 'Content-Length',
	CONTENT_MD5: 'Content-Md5',
	// CONTENT_TRANSFER_ENCODING: 'Content-Transfer-Encoding',
	CONTENT_TYPE: 'Content-Type',
	// COOKIE: 'Cookie',
	DATE: 'date',
	IF_MATCH: 'if-match',
	IF_MODIFIED_SINCE: 'if-modified-since',
	IF_NONE_MATCH: 'if-none-match',
	IF_UNMODIFIED_SINCE: 'if-unmodified-since',
	RANGE: 'Range',
	// USER_AGENT: 'User-Agent',
	PREFIX_FOR_STORAGE: 'x-ms-',
	X_MS_CLIENT_REQUEST_ID: 'x-ms-client-request-id',
	X_MS_COPY_SOURCE: 'x-ms-copy-source',
	X_MS_DATE: 'x-ms-date',
	// X_MS_ERROR_CODE: 'x-ms-error-code',
	X_MS_VERSION: 'x-ms-version',
	// X_MS_CopySourceErrorCode: 'x-ms-copy-source-error-code',
	X_MS_BLOB_TYPE: 'x-ms-blob-type',
	X_MS_BLOB_CONTENT_DISPOSITION: 'x-ms-blob-content-disposition',
};

export async function microsoftApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0) as 'oAuth2' | 'sharedKey';
	const credentialsType =
		authentication === 'oAuth2' ? 'microsoftStorageOAuth2Api' : 'microsoftStorageSharedKeyApi';
	const credentials = await this.getCredentials<{
		baseUrl: string;
	}>(credentialsType);

	const options: IHttpRequestOptions = {
		method,
		url: url ?? `${credentials.baseUrl}${endpoint}`,
		headers,
		body,
		qs,
	};

	const response = await this.helpers.requestWithAuthentication.call(
		this,
		credentialsType,
		options,
	);

	return await new Promise((resolve, reject) => {
		parseString(response as string, {}, (error, data) => {
			if (error) {
				return reject(error);
			}
			resolve(data);
		});
	});
}

export async function microsoftApiPaginateRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
	itemIndex: number = 0,
): Promise<IDataObject[]> {
	// Todo: IHttpRequestOptions doesn't have uri property which is required for requestWithAuthenticationPaginated
	const options: IRequestOptions = {
		method,
		uri: url ?? `https://myaccount.file.core.windows.net/myshare/mydirectorypath/myfile${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	const pages = await this.helpers.requestWithAuthenticationPaginated.call(
		this,
		options,
		itemIndex,
		{
			continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
			request: {
				url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
			},
			requestInterval: 0,
		},
		'microsoftStorageOAuth2Api',
	);

	let results: IDataObject[] = [];
	for (const page of pages) {
		const items = page.body.value as IDataObject[];
		if (items) {
			results = results.concat(items);
		}
	}

	return results;
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, { parseXml: true });
	}

	return data;
}

export function getCanonicalizedHeadersString(requestOptions: IHttpRequestOptions): string {
	let headersArray: Array<{ name: string; value: string }> = [];
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	for (const [name, value] of Object.entries(requestOptions.headers!) as unknown as [
		string,
		string,
	]) {
		if (name.toLowerCase().startsWith(HeaderConstants.PREFIX_FOR_STORAGE)) {
			headersArray.push({ name, value });
		}
	}

	headersArray.sort((a, b): number => {
		return compareHeader(a.name.toLowerCase(), b.name.toLowerCase());
	});

	// Remove duplicate headers
	headersArray = headersArray.filter((value, index, array) => {
		if (index > 0 && value.name.toLowerCase() === array[index - 1].name.toLowerCase()) {
			return false;
		}
		return true;
	});

	let canonicalizedHeadersStringToSign: string = '';
	headersArray.forEach((header) => {
		canonicalizedHeadersStringToSign += `${header.name
			.toLowerCase()
			.trimEnd()}:${header.value.trimStart()}\n`;
	});

	return canonicalizedHeadersStringToSign;
}

export function getCanonicalizedResourceString(
	requestOptions: IHttpRequestOptions,
	credentials: ICredentialDataDecryptedObject,
): string {
	const path: string = new URL(requestOptions.baseURL + requestOptions.url).pathname || '/';
	let canonicalizedResourceString = `/${credentials.account as string}${path}`;
	if (requestOptions.qs && Object.keys(requestOptions.qs).length > 0) {
		canonicalizedResourceString +=
			'\n' +
			Object.keys(requestOptions.qs)
				.sort()
				.map(
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					(key) => `${key.toLowerCase()}:${decodeURIComponent(requestOptions.qs![key] as string)}`,
				)
				.join('\n');
	}

	return canonicalizedResourceString;
}

export async function getBlobs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const container = this.getNodeParameter('container') as INodeParameterResourceLocator;

	/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
	let response: any;

	const qs: IDataObject = {
		restype: 'container',
		comp: 'list',
	};

	if (paginationToken) {
		qs.marker = paginationToken;
		response = await microsoftApiRequest.call(this, 'GET', `/${container.value}`, {}, qs);
	} else {
		qs.maxresults = 5000;
		if (filter) {
			qs.prefix = filter;
		}
		response = await microsoftApiRequest.call(this, 'GET', `/${container.value}`, {}, qs);
	}

	const blobs: Array<{
		name: string;
	}> =
		response.EnumerationResults.Blobs[0] !== ''
			? response.EnumerationResults.Blobs[0].Blob.map((x: any) => ({ name: x.Name[0] }))
			: [];

	const results: INodeListSearchItems[] = blobs
		.map((b) => ({
			name: b.name,
			value: b.name,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return {
		results,
		paginationToken: (response.EnumerationResults.NextMarker[0] as string) || undefined,
	};
	/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
}

export async function getContainers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
	let response: any;

	const qs: IDataObject = {
		comp: 'list',
	};

	if (paginationToken) {
		qs.marker = paginationToken;
		response = await microsoftApiRequest.call(this, 'GET', '/', {}, qs);
	} else {
		qs.maxresults = 5000;
		if (filter) {
			qs.prefix = filter;
		}
		response = await microsoftApiRequest.call(this, 'GET', '/', {}, qs);
	}

	const containers: Array<{
		name: string;
	}> =
		response.EnumerationResults.Containers[0] !== ''
			? response.EnumerationResults.Containers[0].Container.map((x: any) => ({
					name: x.Name[0],
				}))
			: [];

	const results: INodeListSearchItems[] = containers
		.map((c) => ({
			name: c.name,
			value: c.name,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return {
		results,
		paginationToken: (response.EnumerationResults.NextMarker[0] as string) || undefined,
	};
	/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
}
