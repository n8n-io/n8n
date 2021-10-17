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

export async function oneSimpleApiRequest(this: IExecuteFunctions, method: string, resource: string, body: IDataObject = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}) {
	const credentials = await this.getCredentials('oneSimpleApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	let output = 'json';
	// Need to pass this in as an option
	let request = `email=${body.emailAddress}`;

	let options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: uri || `https://onesimpleapi.com/api${resource}?token=${credentials.apiToken}&output=${output}&${request}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		const responseData = await this.helpers.request(options);
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
