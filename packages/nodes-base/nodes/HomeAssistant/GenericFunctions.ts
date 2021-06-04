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

export async function homeAssistantApiRequest(this: IExecuteFunctions, method: string, resource: string, body: IDataObject = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}) {
	const credentials = this.getCredentials('homeAssistantApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
		},
		method,
		qs,
		body,
		uri: uri ?? `${credentials.ssl === true ? 'https' : 'http'}://${credentials.host}:${credentials.port}/api${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
