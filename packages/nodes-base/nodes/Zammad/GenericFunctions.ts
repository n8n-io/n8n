import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import type {
	CustomFields,
} from './types';

import type { Zammad } from './types';

export async function zammadApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const authMethod = this.getNodeParameter('authentication', 0) as Zammad.AuthMethod;

	if (authMethod === 'basicAuth') {

		const {
			username,
			password,
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadBasicAuthApi') as Zammad.BasicAuthCredentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		const options: OptionsWithUri = {
			auth: {
				user: username,
				pass: password,
			},
			method,
			body,
			qs,
			uri: `${baseUrl}/api/v1${endpoint}`,
			rejectUnauthorized: !allowUnauthorizedCerts,
			json: true,
		};

		if (!Object.keys(body).length) {
			delete options.body;
		}

		try {
			// console.log(options);
			const responseData = await this.helpers.request!(options);

			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}

			// This is an escape hatch because here the api works differently
			if (
				endpoint === '/api/v1/online_notifications/mark_all_as_read' ||
				endpoint === '/api/v1/object_manager_attributes_execute_migrations'
			) {
				return { success: true };
			}

			// This is an escape hatch because here the api works differently
			if (
				endpoint.includes('/api/v1/tickets/') &&
				method === 'DELETE' &&
				responseData === undefined
			) {
				return { success: true };
			}

			if (method === 'DELETE' && Object.keys(responseData).length === 0) {
				return { success: true };
			}

			return responseData;

		} catch (error) {
			throw new NodeApiError(this.getNode(), error);
		}

	} else if (authMethod === 'tokenAuth') {

		const {
			apiKey,
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadTokenApi') as Zammad.TokenAuthCredentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		const options: OptionsWithUri = {
			headers: {
				Authorization: `Token token=${apiKey}`,
			},
			method,
			qs,
			uri: `${baseUrl}${endpoint}`,
			rejectUnauthorized: !allowUnauthorizedCerts,
			json: true,
		};

		if (!Object.keys(body).length) {
			delete options.body;
		}

		try {
			const responseData = await this.helpers.request!(options);

			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}

			// This is an escape hatch because here the api works differently
			if (
				endpoint === '/api/v1/online_notifications/mark_all_as_read' ||
				endpoint === '/api/v1/object_manager_attributes_execute_migrations'
			) {
				return { success: true };
			}
			// This is an escape hatch because here the api works differently
			if (
				endpoint.includes('/api/v1/tickets/') &&
				method === 'DELETE' &&
				responseData === undefined
			) {
				return { success: true };
			}
			if (method === 'DELETE' && Object.keys(responseData).length === 0) {
				return { success: true };
			}
			return responseData;

		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

	} else if (authMethod === 'oAuth2') {

		const {
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadOAuth2Api') as Zammad.OAuth2Credentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		const options: OptionsWithUri = {
			method,
			qs,
			uri: `${baseUrl}${endpoint}`,
			rejectUnauthorized: !allowUnauthorizedCerts,
			json: true,
		};

		if (method === 'DELETE' && Object.keys(body).length !== 0) {
			options.body = body;
		}

		try {
			const responseData = await this.helpers.requestOAuth2!.call(this, 'zammadOAuth2Api', options);

			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}

			// This is an escape hatch because here the api works differently
			if (
				endpoint === '/api/v1/online_notifications/mark_all_as_read' ||
				endpoint === '/api/v1/object_manager_attributes_execute_migrations'
			) {
				return { success: true };
			}

			// This is an escape hatch because here the api works differently
			if (
				endpoint.includes('/api/v1/tickets/') &&
				method === 'DELETE' &&
				responseData === undefined
			) {
				return { success: true };
			}

			if (Object.keys(responseData).length === 0) {
				return { success: true };
			}
			return responseData;

		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}

export function populateCustomFields(body: IDataObject, customFields: CustomFields) {
	if (!customFields?.fields?.length) return body;

	customFields.fields.forEach((field) => {
		body[field['name']] = field['value'];
	});

	return body;
}

export function tolerateTrailingSlash(url: string) {
	return url.endsWith('/')
		? url.substr(0, url.length - 1)
		: url;
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}`,
	);
}

export async function zammadApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	limit = 0,
) {
	// https://docs.zammad.org/en/latest/api/intro.html#pagination

	const returnData: IDataObject[] = [];

	let responseData;
	qs.per_page = 20;
	qs.page = 1;

	do {
		responseData = await zammadApiRequest.call(this, method, endpoint, body, qs);
		returnData.push(...responseData);

		if (limit && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		qs.page++;
	} while (responseData.length);

	return returnData;
}

export const prettifyDisplayName = (fieldName: string) => fieldName.replace('name', ' Name');
