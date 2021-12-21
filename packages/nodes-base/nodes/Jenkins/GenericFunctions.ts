import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';


export async function jenkinsApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, uri: string, credentials: IDataObject = {}, qs: IDataObject = {}, headers: IDataObject = {}, body: any = '', option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let generatedHeaders;
	if (credentials.username && credentials.apiKey) {
		const token = Buffer.from(`${credentials.username}:${credentials.apiKey}`).toString('base64');
		generatedHeaders = {
			'Accept': 'application/json',
			'Authorization': `Basic ${token}`,
			...headers,
		};
	} else {
		generatedHeaders = {
			'Accept': 'application/json',
			...headers,
		};
	}

	let options: OptionsWithUri = {
		headers: generatedHeaders,
		method,
		uri: `${uri}`,
		json: true,
		qs,
		body,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function tolerateTrailingSlash(baseUrl: string) {
	return baseUrl.endsWith('/')
		? baseUrl.substr(0, baseUrl.length - 1)
		: baseUrl;
}
