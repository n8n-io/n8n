import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError } from 'n8n-workflow';

export async function uprocApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method: method as IHttpRequestMethods,
		qs,
		body,
		url: 'https://api.uproc.io/api/v2/process',
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'uprocApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
