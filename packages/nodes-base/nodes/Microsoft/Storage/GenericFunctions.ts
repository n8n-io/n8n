import { camelCase } from 'change-case';
import type {
	JsonObject,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IN8nHttpFullResponse,
	INodeListSearchResult,
	INodeListSearchItems,
	INodeParameterResourceLocator,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { Parser } from 'xml2js';
import { firstCharLowerCase, parseBooleans, parseNumbers } from 'xml2js/lib/processors';

import { compareHeader } from './compare-header';

export const XMsVersion = '2021-12-02';

export const HeaderConstants = {
	AUTHORIZATION: 'authorization',
	CONTENT_ENCODING: 'content-encoding',
	CONTENT_LANGUAGE: 'content-language',
	CONTENT_LENGTH: 'content-length',
	CONTENT_MD5: 'content-md5',
	CONTENT_TYPE: 'content-Type',
	DATE: 'date',
	ETAG: 'etag',
	IF_MATCH: 'if-match',
	IF_MODIFIED_SINCE: 'if-Modified-since',
	IF_NONE_MATCH: 'if-none-match',
	IF_UNMODIFIED_SINCE: 'if-unmodified-since',
	ORIGIN: 'origin',
	RANGE: 'range',
	X_MS_COPY_SOURCE: 'x-ms-copy-source',
	X_MS_DATE: 'x-ms-date',
	X_MS_VERSION: 'x-ms-version',
	X_MS_BLOB_TYPE: 'x-ms-blob-type',
	X_MS_BLOB_CONTENT_DISPOSITION: 'x-ms-blob-content-disposition',
	X_MS_BLOB_PUBLIC_ACCESS: 'x-ms-blob-public-access',
	X_MS_HAS_IMMUTABILITY_POLICY: 'x-ms-has-immutability-policy',
	X_MS_HAS_LEGAL_HOLD: 'x-ms-has-legal-hold',
	X_MS_CONTENT_CRC64: 'x-ms-content-crc64',
	X_MS_REQUEST_SERVER_ENCRYPTED: 'x-ms-request-server-encrypted',
	X_MS_ENCRYPTION_SCOPE: 'x-ms-encryption-scope',
	X_MS_VERSION_ID: 'x-ms-version-id',
	X_MS_TAG_COUNT: 'x-ms-tag-count',
	X_MS_COPY_PROGRESS: 'x-ms-copy-progress',
	X_MS_INCREMENTAL_COPY: 'x-ms-incremental-copy',
	X_MS_BLOB_SEQUENCE_NUMBER: 'x-ms-blob-sequence-number',
	X_MS_BLOB_COMMITTED_BLOCK_COUNT: 'x-ms-blob-committed-block-count',
	X_MS_SERVER_ENCRYPTED: 'x-ms-server-encrypted',
	X_MS_ENCRYPTION_CONTEXT: 'x-ms-encryption-context',
	X_MS_BLOB_CONTENT_MD5: 'x-ms-blob-content-md5',
	X_MS_BLOB_SEALED: 'x-ms-blob-sealed',
	X_MS_IMMUTABILITY_POLICY_UNTIL_DATE: 'x-ms-immutability-policy-until-date',
	X_MS_IMMUTABILITY_POLICY_MODE: 'x-ms-immutability-policy-mode',
	X_MS_LEGAL_HOLD: 'x-ms-legal-hold',
	X_MS_DELETE_TYPE_PERMANENT: 'x-ms-delete-type-permanent',
	X_MS_ACCESS_TIER: 'x-ms-access-tier',
	X_MS_BLOB_CACHE_CONTROL: 'x-ms-blob-cache-control',
	X_MS_LEASE_ID: 'x-ms-lease-id',
	X_MS_BLOB_CONTENT_ENCODING: 'x-ms-blob-content-encoding',
	X_MS_BLOB_CONTENT_LANGUAGE: 'x-ms-blob-content-language',
	X_MS_BLOB_CONTENT_TYPE: 'x-ms-blob-content-type',
	X_MS_EXPIRY_OPTION: 'x-ms-expiry-option',
	X_MS_EXPIRY_TIME: 'x-ms-expiry-time',
	X_MS_TAGS: 'x-ms-tags',
	X_MS_UPN: 'x-ms-upn',
	PREFIX_X_MS: 'x-ms-',
	PREFIX_X_MS_META: 'x-ms-meta-',
};

export async function azureStorageApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
): Promise<string> {
	const authentication = this.getNodeParameter('authentication', 0) as 'oAuth2' | 'sharedKey';
	const credentialsType =
		authentication === 'oAuth2' ? 'azureStorageOAuth2Api' : 'azureStorageSharedKeyApi';
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

	options.headers ??= {};
	options.headers[HeaderConstants.X_MS_DATE] = new Date().toUTCString();
	options.headers[HeaderConstants.X_MS_VERSION] = XMsVersion;

	// XML response
	const response = (await this.helpers.requestWithAuthentication.call(
		this,
		credentialsType,
		options,
	)) as string;

	return response;
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;

		const parser = new Parser({
			explicitArray: false,
			tagNameProcessors: [firstCharLowerCase],
		});
		const { error } =
			((await parser.parseStringPromise(data[0].json as unknown as string)) as {
				error: {
					code: string;
					message: string;
					headerName?: string;
					headerValue?: string;
				};
			}) ?? {};

		if (
			error?.code === 'InvalidAuthenticationInfo' &&
			((error as IDataObject)?.authenticationErrorDetail as string) ===
				'Lifetime validation failed. The token is expired.'
		) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Lifetime validation failed. The token is expired.',
				description: 'Please check your credentials and try again',
			});
		}

		if (resource === 'blob') {
			if (error?.code === 'ContainerNotFound') {
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message: "The required container doesn't match any existing one",
					description: "Double-check the value in the parameter 'Container Name' and try again",
				});
			}

			if (operation === 'create') {
				if (
					this.getNodeParameter('from') === 'url' &&
					((error?.code === 'InvalidHeaderValue' &&
						error?.headerName === HeaderConstants.X_MS_COPY_SOURCE) ||
						error?.code === 'CannotVerifyCopySource')
				) {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: 'The provided URL is invalid',
						description: "Double-check the value in the parameter 'URL' and try again",
					});
				}
			} else if (operation === 'delete') {
				if (error?.code === 'BlobNotFound') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: "The required blob doesn't match any existing one",
						description: "Double-check the value in the parameter 'Blob to Delete' and try again",
					});
				}
			} else if (operation === 'get') {
				if (error?.code === 'BlobNotFound') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: "The required blob doesn't match any existing one",
						description: "Double-check the value in the parameter 'Blob to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
				if (
					error?.code === 'InvalidQueryParameterValue' &&
					(this.getNodeParameter('fields', []) as string[]).includes('permissions')
				) {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message:
							'Permissions field is only supported for accounts with a hierarchical namespace enabled',
						description: "Exclude 'Permissions' from 'Fields' and try again",
					});
				}
				if (
					error?.code === 'UnsupportedQueryParameter' &&
					(this.getNodeParameter('fields', []) as string[]).includes('deleted') &&
					(this.getNodeParameter('filter', []) as string[]).includes('deleted')
				) {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: "Including 'Deleted' field and filter is not supported",
						description: "Exclude 'Deleted' from 'Fields' or 'Filter' and try again",
					});
				}
			}
		} else if (resource === 'container') {
			if (operation === 'create') {
				if (error?.code === 'ContainerAlreadyExists') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: 'The specified container already exists',
						description: "Use a unique value for 'Container Name' and try again",
					});
				}
				if (error?.code === 'PublicAccessNotPermitted') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: 'Public access is not permitted on this storage account',
						description: "Check the 'Access Level' and try again",
					});
				}
			} else if (operation === 'delete') {
				if (error?.code === 'ContainerNotFound') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: "The required container doesn't match any existing one",
						description:
							"Double-check the value in the parameter 'Container to Delete' and try again",
					});
				}
			} else if (operation === 'get') {
				if (error?.code === 'ContainerNotFound') {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						message: "The required container doesn't match any existing one",
						description: "Double-check the value in the parameter 'Container to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
			}
		}

		if (error) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: error.code,
				description: error.message,
			});
		} else {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				parseXml: true,
			});
		}
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
		if (name.toLowerCase().startsWith(HeaderConstants.PREFIX_X_MS)) {
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

export function parseHeaders(headers: IDataObject) {
	const parseBooleanHeaders = [
		HeaderConstants.X_MS_DELETE_TYPE_PERMANENT,
		HeaderConstants.X_MS_INCREMENTAL_COPY,
		HeaderConstants.X_MS_SERVER_ENCRYPTED,
		HeaderConstants.X_MS_BLOB_SEALED,
		HeaderConstants.X_MS_REQUEST_SERVER_ENCRYPTED,
		HeaderConstants.X_MS_HAS_IMMUTABILITY_POLICY,
		HeaderConstants.X_MS_HAS_LEGAL_HOLD,
	];
	const parseNumberHeaders = [
		HeaderConstants.X_MS_TAG_COUNT,
		HeaderConstants.CONTENT_LENGTH,
		HeaderConstants.X_MS_BLOB_SEQUENCE_NUMBER,
		HeaderConstants.X_MS_COPY_PROGRESS,
		HeaderConstants.X_MS_BLOB_COMMITTED_BLOCK_COUNT,
	];

	const result: IDataObject = {};

	const metadataKeys = Object.keys(headers).filter((x) =>
		x.startsWith(HeaderConstants.PREFIX_X_MS_META),
	);

	for (const key in headers) {
		if (metadataKeys.includes(key)) {
			continue;
		}

		let newKey = key.startsWith(HeaderConstants.PREFIX_X_MS)
			? camelCase(key.replace(HeaderConstants.PREFIX_X_MS, ''))
			: camelCase(key);
		newKey = newKey.replace('-', '');

		const newValue = parseBooleanHeaders.includes(key)
			? parseBooleans(headers[key] as string)
			: parseNumberHeaders.includes(key)
				? parseNumbers(headers[key] as string)
				: headers[key];

		result[newKey] = newValue;
	}

	if (metadataKeys.length > 0) {
		result.metadata = {};
		for (const key of metadataKeys) {
			(result.metadata as IDataObject)[key.replace(HeaderConstants.PREFIX_X_MS_META, '')] =
				headers[key];
		}
	}

	return result;
}

export async function parseBlobList(
	xml: string,
): Promise<{ blobs: IDataObject[]; maxResults?: number; nextMarker?: string }> {
	const parser = new Parser({
		explicitArray: false,
		tagNameProcessors: [firstCharLowerCase, (name) => name.replace('-', '')],
		valueProcessors: [
			function (value, name) {
				if (
					[
						'deleted',
						'isCurrentVersion',
						'serverEncrypted',
						'incrementalCopy',
						'accessTierInferred',
						'isSealed',
						'legalHold',
					].includes(name)
				) {
					return parseBooleans(value);
				} else if (
					[
						'maxResults',
						'contentLength',
						'blobSequenceNumber',
						'remainingRetentionDays',
						'tagCount',
						'content-Length',
					].includes(name)
				) {
					return parseNumbers(value);
				}
				return value;
			},
		],
	});
	const data = (await parser.parseStringPromise(xml)) as {
		enumerationResults: {
			blobs: { blob: IDataObject | IDataObject[] };
			maxResults: number;
			nextMarker: string;
			prefix: string;
		};
	};

	if (typeof data.enumerationResults.blobs !== 'object') {
		// No items
		return { blobs: [] };
	}

	if (!Array.isArray(data.enumerationResults.blobs.blob)) {
		// Single item
		data.enumerationResults.blobs.blob = [data.enumerationResults.blobs.blob];
	}

	for (const blob of data.enumerationResults.blobs.blob) {
		if (blob.tags) {
			if (!Array.isArray(((blob.tags as IDataObject).tagSet as IDataObject).tag)) {
				((blob.tags as IDataObject).tagSet as IDataObject).tag = [
					((blob.tags as IDataObject).tagSet as IDataObject).tag,
				];
			}
			blob.tags = ((blob.tags as IDataObject).tagSet as IDataObject).tag;
		}
	}

	for (const container of data.enumerationResults.blobs.blob) {
		if (container.metadata === '') {
			delete container.metadata;
		}
		if (container.orMetadata === '') {
			delete container.orMetadata;
		}
	}

	return {
		blobs: data.enumerationResults.blobs.blob,
		maxResults: data.enumerationResults.maxResults,
		nextMarker: data.enumerationResults.nextMarker,
	};
}

export async function parseContainerList(
	xml: string,
): Promise<{ containers: IDataObject[]; maxResults?: number; nextMarker?: string }> {
	const parser = new Parser({
		explicitArray: false,
		tagNameProcessors: [firstCharLowerCase, (name) => name.replace('-', '')],
		valueProcessors: [
			function (value, name) {
				if (
					[
						'deleted',
						'hasImmutabilityPolicy',
						'hasLegalHold',
						'preventEncryptionScopeOverride',
						'isImmutableStorageWithVersioningEnabled',
					].includes(name)
				) {
					return parseBooleans(value);
				} else if (['maxResults', 'remainingRetentionDays'].includes(name)) {
					return parseNumbers(value);
				}
				return value;
			},
		],
	});
	const data = (await parser.parseStringPromise(xml)) as {
		enumerationResults: {
			containers: { container: IDataObject | IDataObject[] };
			maxResults: number;
			nextMarker: string;
			prefix: string;
		};
	};

	if (typeof data.enumerationResults.containers !== 'object') {
		// No items
		return { containers: [] };
	}

	if (!Array.isArray(data.enumerationResults.containers.container)) {
		// Single item
		data.enumerationResults.containers.container = [data.enumerationResults.containers.container];
	}

	for (const container of data.enumerationResults.containers.container) {
		if (container.metadata === '') {
			delete container.metadata;
		}
	}

	return {
		containers: data.enumerationResults.containers.container,
		maxResults: data.enumerationResults.maxResults,
		nextMarker: data.enumerationResults.nextMarker,
	};
}

export async function getBlobs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const container = this.getNodeParameter('container') as INodeParameterResourceLocator;

	let response: string;

	const qs: IDataObject = {
		restype: 'container',
		comp: 'list',
	};

	if (paginationToken) {
		qs.marker = paginationToken;
		response = await azureStorageApiRequest.call(this, 'GET', `/${container.value}`, {}, qs);
	} else {
		qs.maxresults = 5000;
		if (filter) {
			qs.prefix = filter;
		}
		response = await azureStorageApiRequest.call(this, 'GET', `/${container.value}`, {}, qs);
	}

	const data = await parseBlobList(response);

	const results: INodeListSearchItems[] = data.blobs
		.map((c) => ({
			name: c.name as string,
			value: c.name as string,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return {
		results,
		paginationToken: data.nextMarker,
	};
}

export async function getContainers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: string;

	const qs: IDataObject = {
		comp: 'list',
	};

	if (paginationToken) {
		qs.marker = paginationToken;
		response = await azureStorageApiRequest.call(this, 'GET', '/', {}, qs);
	} else {
		qs.maxresults = 5000;
		if (filter) {
			qs.prefix = filter;
		}
		response = await azureStorageApiRequest.call(this, 'GET', '/', {}, qs);
	}

	const data = await parseContainerList(response);

	const results: INodeListSearchItems[] = data.containers
		.map((c) => ({
			name: c.name as string,
			value: c.name as string,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return {
		results,
		paginationToken: data.nextMarker,
	};
}
