import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import type {
	ZammadAuthMethod,
	ZammadBasicAuthCredentials,
	ZammadOAuth2Credentials,
	ZammadTokenAuthCredentials,
} from './types';

export async function zammadApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const authMethod = this.getNodeParameter('authentication', 0) as ZammadAuthMethod;

	if (authMethod === 'basicAuth') {

		const {
			username,
			password,
			domain,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadBasicApi') as ZammadBasicAuthCredentials;

		const options: OptionsWithUri = {
			auth: {
				user: username,
				pass: password,
			},
			method,
			body,
			qs,
			uri: `${domain}/api/v1${endpoint}`,
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
			throw new NodeApiError(this.getNode(), error);
		}

	} else if (authMethod === 'tokenAuth') {

		const {
			apiKey,
			domain,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadTokenApi') as ZammadTokenAuthCredentials;

		const options: OptionsWithUri = {
			headers: {
				Authorization: `Token token=${apiKey}`,
			},
			method,
			qs,
			uri: `${domain}${endpoint}`,
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
			domain,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadOAuth2Api') as ZammadOAuth2Credentials;

		const options: OptionsWithUri = {
			method,
			qs,
			uri: `${domain}${endpoint}`,
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
