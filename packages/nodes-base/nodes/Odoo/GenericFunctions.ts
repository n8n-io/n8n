import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function odooJSONRPCRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	body: any = {},
	// qs: IDataObject = {},
	url: string,
	// option: IDataObject = {}
): Promise<any> {
	try {
		let options: OptionsWithUri = {
			headers: {
				'User-Agent': 'https://n8n.io',
				Connection: 'keep-alive',
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'Content-Type': 'application/json',
			},
			method: 'POST',
			// qs,
			body,
			uri: `${url}/jsonrpc`,
			json: true,
		};

		options = Object.assign({}, options);
		// options.qs.format = 'application/json';

		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
