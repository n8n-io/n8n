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

/**
 * Make an API request to MSG91
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {string} method
 * @param {string} endpoint
 * @param {object} form
 * @param {object | undefined} qs
 * @returns {Promise<any>}
 */
export async function sms77ApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, form: IDataObject, qs?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('sms77Api');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	if ('GET' === method) {
		qs = setPayload(credentials, qs);
	} else {
		form = setPayload(credentials, form);
	}
	const response = await this.helpers.request({
		form,
		json: true,
		method,
		qs,
		uri: `https://gateway.sms77.io/api/${endpoint}`,
	});

	if ('100' !== response.success) {
		throw new NodeApiError(this.getNode(), response, { message: 'Invalid sms77 credentials or API error!' });
	}

	return response;
}


function setPayload(credentials: ICredentialDataDecryptedObject, o?: IDataObject) {
	if (!o) {
		o = {};
	}

	o.p = credentials!.apiKey as string;
	o.json = 1;
	o.sendwith = 'n8n';

	return o;
}
