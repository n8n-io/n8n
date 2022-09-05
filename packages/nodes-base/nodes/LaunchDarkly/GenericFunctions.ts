import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function launchDarklyApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: object = {}, query: object = {}, headers: {} | undefined = undefined, option: {} = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;
	let options: OptionsWithUri = {
		method,
		headers: headers || {
			'Content-Type': 'application/json; charset=utf-8',
		},
		body,
		qs: query,
		uri: `https://app.launchdarkly.com/api/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	try {
		let response: any; // tslint:disable-line:no-any

		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('launchDarklyApi');
			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}
			options.headers!.Authorization = credentials.accessToken;
			//@ts-ignore
			response = await this.helpers.request(options);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
