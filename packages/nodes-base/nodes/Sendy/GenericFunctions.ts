import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function sendyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('sendyApi');

	body.api_key = credentials.apiKey;

	body.boolean = true;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs,
		uri: `${credentials.url}${path}`,
	};

	try {
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
