import type { OptionsWithUrl } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
function resolveHeaderData(fullResponse: any) {
	if (fullResponse.statusCode === 201) {
		return { urn: fullResponse.headers['x-restli-id'] };
	} else {
		return fullResponse.body;
	}
}

export async function linkedInApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	binary?: boolean,
	_headers?: object,
): Promise<any> {
	let options: OptionsWithUrl = {
		headers: {
			Accept: 'application/json',
			'X-Restli-Protocol-Version': '2.0.0',
			'LinkedIn-Version': '202301',
		},
		method,
		body,
		url: binary ? endpoint : `https://api.linkedin.com/rest${endpoint}`,
		json: true,
	};
	options = Object.assign({}, options, {
		resolveWithFullResponse: true,
	});
	// If uploading binary data
	if (binary) {
		delete options.json;
		options.encoding = null;
	}

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return resolveHeaderData(
			await this.helpers.requestOAuth2.call(this, 'linkedInOAuth2Api', options, {
				tokenType: 'Bearer',
			}),
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
