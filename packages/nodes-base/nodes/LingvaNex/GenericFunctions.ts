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

export async function lingvaNexApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = await this.getCredentials('lingvaNexApi');
		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}
		let options: OptionsWithUri = {
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			method,
			qs,
			body,
			uri: uri || `https://api-b2b.backenster.com/b1/api/v3${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		const response = await this.helpers.request!(options);

		if (response.err !== null) {
			throw new NodeApiError(this.getNode(), response);
		}

		return response;

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
