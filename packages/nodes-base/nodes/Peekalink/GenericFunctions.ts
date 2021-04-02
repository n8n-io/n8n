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

export async function peekalinkApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = this.getCredentials('peekalinkApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		let options: OptionsWithUri = {
			headers: {
				'X-API-Key': credentials.apiKey,
			},
			method,
			qs,
			body,
			uri: uri || `https://api.peekalink.io${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Peekalink error response [${error.statusCode}]: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
