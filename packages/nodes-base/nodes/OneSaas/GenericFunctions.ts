import {
	OptionsWithUri
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function oneSaasRequest(this: IExecuteFunctions, method: string, resource: string, body: IDataObject = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}) {
	const credentials = await this.getCredentials('oneSaasApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs,
		uri: uri || `https://api.1saas.co/v1${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	options.headers!['auth'] = `${credentials.apiKey}`;

	try {
		const responseData = await this.helpers.request(options);
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
