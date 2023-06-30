import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function vonageApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('vonageApi');

	body.api_key = credentials.apiKey as string;

	body.api_secret = credentials.apiSecret as string;

	const options: OptionsWithUri = {
		method,
		form: body,
		qs,
		uri: `https://rest.nexmo.com${path}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
