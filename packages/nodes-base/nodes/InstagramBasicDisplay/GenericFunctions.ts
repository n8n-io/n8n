import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function instagramBasicDisplayApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: object,
	qs: IDataObject,
	uri?: string
): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
			'Content-Type': 'text/plain',
			'Accept': 'application/json',
		},
		body,
		qs,
		uri: uri || `https://graph.instagram.com${endpoint}`,
		json: true
	};

	try {

		const credentials = this.getCredentials('instagramBasicDisplayOAuth2Api');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'instagramBasicDisplayOAuth2Api', options, 'Bearer');

	} catch (error) {

		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Instagram credentials are not valid!');
		}

		if (error.error && error.error.error && error.error.error.message) {
				// Try to return the error prettier
				throw new Error(`Instagram error response [${error.statusCode}]: ${error.error.error.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
