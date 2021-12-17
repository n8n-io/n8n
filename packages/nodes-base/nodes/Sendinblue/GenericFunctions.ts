import {
		OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IContextObject,
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function sendinblueApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IContextObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('sendinblue') as IDataObject;
	const apiUrl = 'https://api.sendinblue.com/v3/' + endpoint;

	const options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'api-key': credentials.apiKey,
		},
		method,
		body: method === 'GET' ? undefined : body,
		uri: apiUrl,
		json: true,
	};

	try {
		try {
			// @ts-ignore
			return await this.helpers.request(options);
		} catch (error) {
			if (error.error.message.length > 0) {
				throw new Error(`${error.statusCode} - ${error.error.message}`);
			}
			throw error;
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
