import type { OptionsWithUri } from 'request';

import type {
	JsonObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function peekalinkApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
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

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
