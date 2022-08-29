import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IHttpRequestMethods, IHttpRequestOptions, NodeApiError } from 'n8n-workflow';

export async function linkedInApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body: any = {}, binary?: boolean, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const options: IHttpRequestOptions = {
		headers: {
			'Accept': 'application/json',
			'X-Restli-Protocol-Version': '2.0.0',
		},
		method,
		body,
		url: binary ? endpoint : `https://api.linkedin.com/v2${endpoint}`,
		json: true,
	};

	// If uploading binary data
	if (binary) {
		delete options.json;
		options.encoding = undefined;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.requestOAuth2!.call(this, 'linkedInOAuth2Api', options, { tokenType: 'Bearer' });
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
