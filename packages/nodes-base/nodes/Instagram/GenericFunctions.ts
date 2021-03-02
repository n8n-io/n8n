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

export async function instagramApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
	uri = '',
) {
	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		qs,
		body,
		uri: uri || `https://graph.instagram.com${endpoint}`,
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
export async function instagramApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
) {
	let responseData;
	const returnData: IDataObject[] = [];

	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	let uri = '';

	do {
		responseData = await instagramApiRequest.call(this, method, endpoint, qs, body, uri);

		returnData.push(...responseData.data);

		if (!returnAll && returnData.length > limit) {
			return responseData.data.slice(0, limit);
		}

		uri = responseData.paging.next;

	} while (responseData.paging.next);

	return returnData;
}
