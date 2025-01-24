import * as crypto from 'crypto';
import type {
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import * as querystring from 'querystring';

export const HeaderConstants = {
	// Required
	AUTHORIZATION: 'Authorization',
	CONTENT_TYPE: 'Content-Type',
	X_MS_DATE: 'x-ms-date',
	X_MS_VERSION: 'x-ms-version',

	//Required - for session consistency only
	X_MS_SESSION_TOKEN: 'x-ms-session-token',

	// Optional
	IF_MATCH: 'If-Match',
	IF_NONE_MATCH: 'If-None-Match',
	IF_MODIFIED_SINCE: 'If-Modified-Since',
	USER_AGENT: 'User-Agent',
	X_MS_ACTIVITY_ID: 'x-ms-activity-id',
	X_MS_CONSISTENCY_LEVEL: 'x-ms-consistency-level',
	X_MS_CONTINUATION: 'x-ms-continuation',
	X_MS_MAX_ITEM_COUNT: 'x-ms-max-item-count',
	X_MS_DOCUMENTDB_PARTITIONKEY: 'x-ms-documentdb-partitionkey',
	X_MS_DOCUMENTDB_QUERY_ENABLECROSSPARTITION: 'x-ms-documentdb-query-enablecrosspartition',
	A_IM: 'A-IM',
	X_MS_DOCUMENTDB_PARTITIONKEYRANGEID: 'x-ms-documentdb-partitionkeyrangeid',
	X_MS_COSMOS_ALLOW_TENTATIVE_WRITES: 'x-ms-cosmos-allow-tentative-writes',

	PREFIX_FOR_STORAGE: 'x-ms-',
};

export function getAuthorizationTokenUsingMasterKey(
	verb: string,
	resourceType: string,
	resourceLink: string,
	date: string,
	masterKey: string,
): string {
	const key = Buffer.from(masterKey, 'base64');

	const payload =
		`${verb.toLowerCase()}\n` +
		`${resourceType.toLowerCase()}\n` +
		`${resourceLink}\n` +
		`${date.toLowerCase()}\n` +
		'\n';

	const hmacSha256 = crypto.createHmac('sha256', key);
	const hashPayload = hmacSha256.update(payload, 'utf8').digest('base64');

	const authorizationString = querystring.escape(`type=master&ver=1.0&sig=${hashPayload}`);

	return authorizationString;
}

export async function azureCosmosDbRequest(
	this: ILoadOptionsFunctions,
	opts: IHttpRequestOptions,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('azureCosmosDb');
	const databaseAccount = credentials?.database;

	if (!databaseAccount) {
		throw new ApplicationError('Database account not found in credentials!', { level: 'error' });
	}

	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: `https://${databaseAccount}.documents.azure.com`,
		json: true,
	};

	const errorMapping: Record<number, Record<string, string>> = {
		403: {
			'The security token included in the request is invalid.':
				'The Cosmos DB credentials are not valid!',
			'The request signature we calculated does not match the signature you provided':
				'The Cosmos DB credentials are not valid!',
		},
		404: {
			'The specified resource does not exist.': 'The requested resource was not found!',
		},
	};

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'azureCosmosDb',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		const statusCode = (error.statusCode || error.cause?.statusCode) as number;
		let errorMessage = (error.response?.body?.message ||
			error.response?.body?.Message ||
			error.message) as string;

		if (statusCode in errorMapping && errorMessage in errorMapping[statusCode]) {
			throw new ApplicationError(errorMapping[statusCode][errorMessage], {
				level: 'error',
			});
		}

		if (error.cause?.error) {
			try {
				errorMessage = error.cause?.error?.message as string;
			} catch (ex) {
				throw new ApplicationError(
					`Failed to extract error details: ${ex.message || 'Unknown error'}`,
					{ level: 'error' },
				);
			}
		}

		throw new ApplicationError(`Cosmos DB error response [${statusCode}]: ${errorMessage}`, {
			level: 'error',
		});
	}
}

export async function searchCollections(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const dbId = this.getNodeParameter('dbId') as string;
	if (!dbId) {
		throw new ApplicationError('Database ID is required');
	}

	const credentials = await this.getCredentials('azureCosmosDb');
	const databaseAccount = credentials?.databaseAccount;

	if (!databaseAccount) {
		throw new ApplicationError('Database account not found in credentials!', { level: 'error' });
	}

	const opts: IHttpRequestOptions = {
		method: 'GET',
		url: `/dbs/${dbId}/colls`,
		baseURL: `https://${databaseAccount}.documents.azure.com`,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const responseData: IDataObject = await azureCosmosDbRequest.call(this, opts);

	const responseBody = responseData as {
		Collections: IDataObject[];
	};
	const collections = responseBody.Collections;

	if (!collections) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = collections
		.map((collection) => ({
			name: String(collection.id),
			value: String(collection.id),
		}))
		.filter((collection) => !filter || collection.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function searchDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'GET',
		url: '/dbs',
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const responseData: IDataObject = await azureCosmosDbRequest.call(this, opts);

	const responseBody = responseData as {
		Databases: IDataObject[];
	};
	const databases = responseBody.Databases;

	if (!databases) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = databases
		.map((database) => ({
			name: String(database.id),
			value: String(database.id),
		}))
		.filter((database) => !filter || database.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}
