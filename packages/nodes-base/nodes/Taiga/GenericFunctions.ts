import type { OptionsWithUri } from 'request';

import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { createHash } from 'crypto';

export async function getAuthorization(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	credentials?: ICredentialDataDecryptedObject,
): Promise<string> {
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const { password, username } = credentials;
	const options: OptionsWithUri = {
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
		body: {
			type: 'normal',
			password,
			username,
		},
		uri: credentials.url ? `${credentials.url}/api/v1/auth` : 'https://api.taiga.io/api/v1/auth',
		json: true,
	};

	try {
		const response = await this.helpers.request(options);

		return response.auth_token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function taigaApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,
	body = {},
	query = {},
	uri?: string | undefined,
	option = {},
): Promise<any> {
	const credentials = await this.getCredentials('taigaApi');

	const authToken = await getAuthorization.call(this, credentials);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {
			bearer: authToken,
		},
		qs: query,
		method,
		body,
		uri:
			uri || credentials.url
				? `${credentials.url}/api/v1${resource}`
				: `https://api.taiga.io/api/v1${resource}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function taigaApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await taigaApiRequest.call(this, method, resource, body, query, uri, {
			resolveWithFullResponse: true,
		});
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
		uri = responseData.headers['x-pagination-next'];
		const limit = query.limit as number | undefined;
		if (limit && returnData.length >= limit) {
			return returnData;
		}
	} while (
		responseData.headers['x-pagination-next'] !== undefined &&
		responseData.headers['x-pagination-next'] !== ''
	);
	return returnData;
}

export function getAutomaticSecret(credentials: ICredentialDataDecryptedObject) {
	const data = `${credentials.username},${credentials.password}`;
	return createHash('md5').update(data).digest('hex');
}

export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
	i: number,
) {
	let responseData;
	qs.project = this.getNodeParameter('projectId', i) as number;
	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return taigaApiRequestAllItems.call(this, method, endpoint, body, qs);
	} else {
		qs.limit = this.getNodeParameter('limit', i);
		responseData = await taigaApiRequestAllItems.call(this, method, endpoint, body, qs);
		return responseData.splice(0, qs.limit);
	}
}

export const toOptions = (items: LoadedResource[]) =>
	items.map(({ name, id }) => ({ name, value: id }));

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: Resource) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}.`,
	);
}

export async function getVersionForUpdate(this: IExecuteFunctions, endpoint: string) {
	return taigaApiRequest.call(this, 'GET', endpoint).then((response) => response.version);
}
