import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export function simplify(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	responseData: IDataObject,
	index: number,
): IDataObject {
	const simplify = this.getNodeParameter('simplify', index) as boolean;
	if (simplify && responseData.data) {
		//@ts-ignore
		return responseData.data;
	}
	return responseData;
}

/**
 * Make an API request to Supportpal
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function supportpalApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('supportpalApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	// Convert QS Booleans to 0 or 1
	for (const key in qs) {
		if (qs[key] === true) {
			qs[key] = 1;
		}
		if (qs[key] === false) {
			qs[key] = 0;
		}
	}

	// Convert Json if applicable
	for (const key in qs) {
		try {
			const parsedJson = JSON.parse(qs[key] as string);
			qs[key] = parsedJson;
		} catch (e) {
			continue;
		}
	}

	const options: OptionsWithUri = {
		auth: {
			user: credentials.apiKey as string,
		},
		method,
		qs,
		uri: `${credentials.supportpalUrl}${endpoint}`,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts as boolean,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const responseData = await this.helpers.request!(options);

		if (responseData && responseData.success === false) {
			throw new NodeApiError(this.getNode(), responseData);
		}

		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
