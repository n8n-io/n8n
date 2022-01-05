import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an API request to Twilio
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function twilioApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('twilioApi') as {
		accountSid: string;
		authType: 'authToken' | 'apiKey';
		authToken: string;
		apiKeySid: string;
		apiKeySecret: string;
	};

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	const options: OptionsWithUri = {
		method,
		form: body,
		qs: query,
		uri: `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${endpoint}`,
		json: true,
	};

	if (credentials.authType === 'apiKey') {
		options.auth = {
			user: credentials.apiKeySid,
			password: credentials.apiKeySecret,
		};
	} else if (credentials.authType === 'authToken') {
		options.auth = {
			user: credentials.accountSid,
			pass: credentials.authToken,
		};
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
