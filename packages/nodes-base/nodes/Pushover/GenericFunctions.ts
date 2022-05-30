import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError,
} from 'n8n-workflow';

export async function pushoverApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		method,
		body,
		qs,
		url: `https://api.pushover.net/1${path}`,
		json: true,
	};

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestWithAuthentication.call(this, 'pushoverApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
