import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function phantombusterApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	option = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('phantombusterApi');

	const options: IHttpRequestOptions = {
		headers: {},
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
		return await this.helpers.requestWithAuthentication.call(this, 'phantombusterApi', options);
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
