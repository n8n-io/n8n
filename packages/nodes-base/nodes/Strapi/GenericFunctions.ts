import type { OptionsWithUri } from 'request';

import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const removeTrailingSlash = (url: string) => {
	if (url.endsWith('/')) {
		return url.slice(0, -1);
	}
	return url;
};

export async function strapiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0);
	let credentials: ICredentialDataDecryptedObject;

	if (authenticationMethod === 'password') {
		credentials = await this.getCredentials('strapiApi');
	} else {
		credentials = await this.getCredentials('strapiTokenApi');
	}

	const url = removeTrailingSlash(credentials.url as string);

	try {
		const options: OptionsWithUri = {
			headers: {},
			method,
			body,
			qs,
			uri: uri || credentials.apiVersion === 'v4' ? `${url}/api${resource}` : `${url}${resource}`,
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

		return await this.helpers.requestWithAuthentication.call(
			this,
			authenticationMethod === 'password' ? 'strapiApi' : 'strapiTokenApi',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
): Promise<{ jwt: string }> {
	const credentials = await this.getCredentials('strapiApi');

	const url = removeTrailingSlash(credentials.url as string);

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
		uri: credentials.apiVersion === 'v4' ? `${url}/api/auth/local` : `${url}/auth/local`,
		json: true,
	};
	return this.helpers.request(options) as Promise<{ jwt: string }>;
}

export async function strapiApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	headers: IDataObject = {},
	apiVersion: string = 'v3',
) {
	const returnData: IDataObject[] = [];

	let responseData;
	if (apiVersion === 'v4') {
		query['pagination[pageSize]'] = 20;
		query['pagination[page]'] = 1;
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
			query['pagination[page]']++;
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
