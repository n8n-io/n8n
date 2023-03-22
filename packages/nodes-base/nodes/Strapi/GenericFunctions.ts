import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function strapiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: string,
	resource: string,

	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const credentials = await this.getCredentials('strapiApi');

	try {
		const options: OptionsWithUri = {
			headers: {},
			method,
			body,
			qs,
			uri:
				uri || credentials.apiVersion === 'v4'
					? `${credentials.url}/api${resource}`
					: `${credentials.url}${resource}`,
			json: true,
			qsStringifyOptions: {
				arrayFormat: 'indice',
			},
		};
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
): Promise<any> {
	const credentials = await this.getCredentials('strapiApi');
	let options = {} as OptionsWithUri;
	options = {
		headers: {
			'content-type': 'application/json',
		},
		method: 'POST',
		body: {
			identifier: credentials.email,
			password: credentials.password,
		},
		uri:
			credentials.apiVersion === 'v4'
				? `${credentials.url}/api/auth/local`
				: `${credentials.url}/auth/local`,
		json: true,
	};
	return this.helpers.request(options);
}

export async function strapiApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	headers: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	const { apiVersion } = await this.getCredentials('strapiApi');

	let responseData;
	if (apiVersion === 'v4') {
		query['pagination[pageSize]'] = 20;
		query['pagination[page]'] = 0;
		do {
			({ data: responseData } = await strapiApiRequest.call(
				this,
				method,
				resource,
				body,
				query,
				undefined,
				headers,
			));
			query['pagination[page]'] += query['pagination[pageSize]'];
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} while (responseData.length !== 0);
	} else {
		query._limit = 20;
		query._start = 0;
		do {
			responseData = await strapiApiRequest.call(
				this,
				method,
				resource,
				body,
				query,
				undefined,
				headers,
			);
			query._start += query._limit;
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} while (responseData.length !== 0);
	}
	return returnData;
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
