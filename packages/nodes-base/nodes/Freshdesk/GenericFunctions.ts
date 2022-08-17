import { OptionsWithUri } from 'request';

import { BINARY_ENCODING, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function freshdeskApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('freshdeskApi');

	const apiKey = `${credentials.apiKey}:X`;

	const endpoint = 'freshdesk.com/api/v2';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `${Buffer.from(apiKey).toString(BINARY_ENCODING)}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `https://${credentials.domain}.${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorData = (error.message || '').split(' - ')[1] as string;
		if (errorData) {
			const parsedError = JSON.parse(errorData.trim());
			console.log(parsedError);
			let { message } = parsedError;
			const { errors, description } = parsedError;
			if (!message) {
				message =
					((errors as IDataObject[]) || [])
						.map((error: IDataObject) => error.message as string)
						.join(', ') || error.message;
			}
			throw new NodeApiError(this.getNode(), error, { message, description });
		}
		throw new NodeApiError(this.getNode(), error, { message: error.message });
	}
}

export async function freshdeskApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.per_page = 100;
	do {
		responseData = await freshdeskApiRequest.call(this, method, endpoint, body, query, uri, {
			resolveWithFullResponse: true,
		});
		if (responseData.headers.link) {
			uri = responseData.headers['link'].split(';')[0].replace('<', '').replace('>', '');
		}
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers['link'] !== undefined &&
		responseData.headers['link'].includes('rel="next"')
	);
	return returnData;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}

export function capitalize(s: string): string {
	if (typeof s !== 'string') return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}
