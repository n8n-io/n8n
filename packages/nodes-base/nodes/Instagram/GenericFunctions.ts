import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function instagramBasicDisplayApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
) {
	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		qs,
		body,
		uri: `https://graph.instagram.com${endpoint}`,
		json: true,
	};

	if (Object.keys(qs).length === 0) {
		delete qs.body;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'instagramOAuth2Api', options, { tokenType: 'Bearer' });
	} catch (error) {
		if (error?.error?.error?.message) {
				throw new Error(`Instagram error response [${error.statusCode}]: ${error?.error?.error?.message}`);
		}

		throw error;
	}
}

/**
 * Make an authenticated API request to Instagram Basic Display API and return all results.
 */
export async function instagramBasicDisplayApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
) {
	let responseData;
	const returnData: IDataObject[] = [];

	const type = this.getNodeParameter('type', 0) as 'userMedia' | 'albumMedia' | 'fieldsAndEdges';
	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	do {
		responseData = await instagramBasicDisplayApiRequest.call(this, method, endpoint, qs, body);

		if (type === 'fieldsAndEdges') {
			returnData.push(responseData);
		} else if (type === 'userMedia' || type === 'albumMedia') {
			returnData.push(...responseData.data);
		}

		if (!returnAll && returnData.length > limit) {
			return responseData.data.slice(0, limit);
		}

	} while (responseData.next);

	return returnData;
}
