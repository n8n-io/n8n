import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	JsonObject,
	NodeOperationError
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an API request to Zammad
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function zammadApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject = {}
): Promise<any> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0
	) as string;

	if(authenticationMethod === 'basicAuth'){
		const credentials = await this.getCredentials('zammadBasicApi');

		if (credentials === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				'No credentials got returned!'
			);
		}

		const options: OptionsWithUri = {
			auth: {
				user: credentials.userName as string,
				pass: credentials.password as string,
			},
			method,
			qs,
			uri: `${credentials.zammadUrl}${endpoint}`,
			json: true
		};

		if (Object.keys(body).length !== 0) {
			options.body = body;
		}

		try {
			const responseData = await this.helpers.request!(options);
			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}
			// This is an escape hatch because here the api works differently
			if(endpoint === '/api/v1/online_notifications/mark_all_as_read' || endpoint === '/api/v1/object_manager_attributes_execute_migrations')
			{
				return { success: true };
			}
			// This is an escape hatch because here the api works differently
			if(endpoint.includes('/api/v1/tickets/') && method === 'DELETE' && responseData === undefined){
				return { success: true };
			}
			if(method === 'DELETE' && Object.keys(responseData).length === 0){
				return { success: true };
			}
			return responseData;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

	} else if(authenticationMethod === 'tokenAuth') {
		const credentials = await this.getCredentials('zammadTokenApi');

		if (credentials === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				'No credentials got returned!'
			);
		}

		const options: OptionsWithUri = {
			headers: { Authorization: `Token token=${credentials.apiKey}` },
			method,
			qs,
			uri: `${credentials.zammadUrl}${endpoint}`,
			json: true
		};

		if (Object.keys(body).length !== 0) {
			options.body = body;
		}

		try {
			const responseData = await this.helpers.request!(options);
			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}
			// This is an escape hatch because here the api works differently
			if(endpoint === '/api/v1/online_notifications/mark_all_as_read' || endpoint === '/api/v1/object_manager_attributes_execute_migrations')
			{
				return { success: true };
			}
			// This is an escape hatch because here the api works differently
			if(endpoint.includes('/api/v1/tickets/') && method === 'DELETE' && responseData === undefined){
				return { success: true };
			}
			if(method === 'DELETE' && Object.keys(responseData).length === 0){
				return { success: true };
			}
			return responseData;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

	} else {
		// Must be OAuth2, as it is the only option left
		const credentials = await this.getCredentials('zammadOAuth2Api');

		if (credentials === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				'No credentials got returned!'
			);
		}

		const options: OptionsWithUri = {
			method,
			qs,
			uri: `${credentials.zammadUrl}${endpoint}`,
			json: true
		};
		if (method === 'DELETE' && Object.keys(body).length !== 0) {
			options.body = body;
		}
		try {
			const responseData = await this.helpers.requestOAuth2!.call(
				this,
				'zammadOAuth2Api',
				options
			);
			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}
			// This is an escape hatch because here the api works differently
			if(endpoint === '/api/v1/online_notifications/mark_all_as_read' || endpoint === '/api/v1/object_manager_attributes_execute_migrations')
			{
				return { success: true };
			}
			// This is an escape hatch because here the api works differently
			if(endpoint.includes('/api/v1/tickets/') && method === 'DELETE' && responseData === undefined){
				return { success: true };
			}
			if(Object.keys(responseData).length === 0){
				return { success: true };
			}
			return responseData;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

}
