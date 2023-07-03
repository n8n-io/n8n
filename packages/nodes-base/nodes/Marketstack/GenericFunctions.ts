import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function marketstackApiRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('marketstackApi');
	const protocol = credentials.useHttps ? 'https' : 'http'; // Free API does not support HTTPS

	const options: OptionsWithUri = {
		method,
		uri: `${protocol}://api.marketstack.com/v1${endpoint}`,
		qs: {
			access_key: credentials.apiKey,
			...qs,
		},
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function marketstackApiRequestAllItems(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0, false);
	const limit = this.getNodeParameter('limit', 0, 0);

	let responseData;
	const returnData: IDataObject[] = [];

	qs.offset = 0;

	do {
		responseData = await marketstackApiRequest.call(this, method, endpoint, body, qs);
		returnData.push(...(responseData.data as IDataObject[]));

		if (!returnAll && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		qs.offset += responseData.count;
	} while (responseData.total > returnData.length);

	return returnData;
}

export const format = (datetime?: string) => datetime?.split('T')[0];

export function validateTimeOptions(this: IExecuteFunctions, timeOptions: boolean[]) {
	if (timeOptions.every((o) => !o)) {
		throw new NodeOperationError(
			this.getNode(),
			'Please filter by latest, specific date or timeframe (start and end dates).',
		);
	}

	if (timeOptions.filter(Boolean).length > 1) {
		throw new NodeOperationError(
			this.getNode(),
			'Please filter by one of latest, specific date, or timeframe (start and end dates).',
		);
	}
}
