import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

export async function storyblokApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try{
		const authenticationMethod = this.getNodeParameter('source', 0) as string;

		if (authenticationMethod === 'contentApi') {
			const credentials = this.getCredentials('storyblokContentApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const apiUrl = 'https://api.storyblok.com';

			let options: OptionsWithUri = {
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				method,
				qs,
				body,
				uri: uri || `${apiUrl}${resource}?token=${credentials.apiKey}`,
				json: true
			};
	
			options = Object.assign({}, options, option);
	
			if (Object.keys(options.body).length === 0) {
				delete options.body;
			}
	
			return await this.helpers.request!(options);
		}

		if (authenticationMethod === 'managementApi') {
			const credentials = this.getCredentials('storyblokManagementApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const apiUrl = 'https://mapi.storyblok.com';

			let options: OptionsWithUri = {
				headers: {
					'Content-Type': 'application/json',
					'Authorization': credentials.accessToken,
				},
				method,
				qs,
				body,
				uri: uri || `${apiUrl}${resource}`,
				json: true
			};
	
			options = Object.assign({}, options, option);
	
			if (Object.keys(options.body).length === 0) {
				delete options.body;
			}
	
			return await this.helpers.request!(options);
		}
	} catch(error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Storyblok error response [${error.statusCode}]: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
