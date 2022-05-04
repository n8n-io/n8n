import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function pushoverApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('pushoverApi');

	if (method !== 'GET') {
		body.token = credentials.apiKey as string;
	}

	const options: OptionsWithUri = {
		method,
		formData: body,
		qs,
		uri: `https://api.pushover.net/1${path}`,
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
