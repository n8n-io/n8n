import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

export async function scrapingBeeApiRequest(
	this: IExecuteFunctions,
	method: string,
	headers: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
) {
	const { apiKey } = await this.getCredentials('scrapingBeeApi') as { apiKey: string };

	const options: OptionsWithUri = {
		uri: 'https://app.scrapingbee.com/api/v1',
		method,
		headers: {
			'User-Agent': 'n8n',
			...headers,
		},
		qs: {
			api_key: apiKey,
			...qs,
		},
		json: true,
	};

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.error === 'Request Time-out' || error.error === 'net::ERR_TIMED_OUT') {
			error.message = 'The scraping request has timed out';
		}

		if (error.error === 'net::ERR_EMPTY_RESPONSE') {
			return {};
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function handleBinaryData(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	i: number,
	method: 'get' | 'post',
	headers: IDataObject,
	qs: IDataObject,
) {
	const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
	const data = await scrapingBeeApiRequest.call(this, method, headers, qs, { encoding: null });

	items[i].binary = items[i].binary ?? {};
	items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(data);
	items[i].binary![binaryProperty].fileName = 'screenshot';
	items[i].binary![binaryProperty].fileExtension = 'png';
	items[i].json = {};

	return items;
}
