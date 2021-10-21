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
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function jenkinsApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, uri: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('jenkinsApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
		},
		method,
		uri: `${uri}?token=${credentials.apiKey}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
