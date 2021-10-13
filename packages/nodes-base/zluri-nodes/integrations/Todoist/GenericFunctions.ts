import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';
import { zluriOAuthApiRequest } from '../util';

export async function todoistApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		uri: `https://${endpoint}${resource}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		return await zluriOAuthApiRequest.call(this as IExecuteFunctions ,options)

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
