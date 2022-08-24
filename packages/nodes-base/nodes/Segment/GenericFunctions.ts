import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function segmentApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.segment.io/v1${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'segmentApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
