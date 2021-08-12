import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {RequestPromiseOptions} from 'request-promise-native';
/**
 * Make an API request to Sms77
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {string} method
 * @param {string} endpoint
 * @param {object} form
 * @param {object | undefined} qs
 * @returns {Promise<any>}
 */
export async function sms77ApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, data: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('sms77Api');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const opts: RequestPromiseOptions = {
		headers: {
			SentWith: 'n8n',
			'X-Api-Key': credentials.apiKey,
		},
		json: true,
		method,
	};
	opts['GET' === method ? 'qs' : 'form'] = setPayload(credentials, data);
	const response = await this.helpers.request(`https://gateway.sms77.io/api/${endpoint}`, opts);

	if ('100' !== response.success) {
		throw new NodeApiError(this.getNode(), response, { message: 'Invalid sms77 credentials or API error!' });
	}

	return response;
}


function setPayload(credentials: ICredentialDataDecryptedObject, o?: IDataObject) {
	if (!o) {
		o = {};
	}

	o.json = 1;

	return o;
}
