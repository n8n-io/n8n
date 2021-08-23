import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function phantombusterApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('phantombusterApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'X-Phantombuster-Key': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.phantombuster.com/api/v2${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function validateJSON(self: IExecuteFunctions, json: string | undefined, name: string) {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		throw new NodeOperationError(self.getNode(), `${name} must provide a valid JSON`);
	}
	return result;
}
