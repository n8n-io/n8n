import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function peekalinkApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	try {
		const credentials = await this.getCredentials('peekalinkApi');
		let options: OptionsWithUri = {
			headers: {
				'X-API-Key': credentials.apiKey,
			},
			method,
			qs,
			body,
			uri: uri || `https://api.peekalink.io${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
