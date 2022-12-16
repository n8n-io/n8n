import { OptionsWithUrl } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

import { createHmac } from 'crypto';

import qs from 'qs';

export async function unleashedApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,

	body: any = {},
	query: IDataObject = {},
	pageNumber?: number,
	headers?: object,
): Promise<any> {
	const paginatedPath = pageNumber ? `/${path}/${pageNumber}` : `/${path}`;

	const options: OptionsWithUrl = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs: query,
		body,
		url: `https://api.unleashedsoftware.com/${paginatedPath}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	const credentials = await this.getCredentials('unleashedSoftwareApi');

	const signature = createHmac('sha256', credentials.apiKey as string)
		.update(qs.stringify(query))
		.digest('base64');

	options.headers = Object.assign({}, headers, {
		'api-auth-id': credentials.apiId,
		'api-auth-signature': signature,
	});

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function unleashedApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];
	let responseData;
	let pageNumber = 1;

	query.pageSize = 1000;

	do {
		responseData = await unleashedApiRequest.call(this, method, endpoint, body, query, pageNumber);
		returnData.push.apply(returnData, responseData[propertyName]);
		pageNumber++;
	} while (
		(responseData.Pagination.PageNumber as number) <
		(responseData.Pagination.NumberOfPages as number)
	);
	return returnData;
}

//.NET code is serializing dates in the following format: "/Date(1586833770780)/"
//which is useless on JS side and could not treated as a date for other nodes
//so we need to convert all of the fields that has it.

export function convertNETDates(item: { [key: string]: any }) {
	Object.keys(item).forEach((path) => {
		const type = typeof item[path] as string;
		if (type === 'string') {
			const value = item[path] as string;
			const a = /\/Date\((\d*)\)\//.exec(value);
			if (a) {
				item[path] = new Date(+a[1]);
			}
		}
		if (type === 'object' && item[path]) {
			convertNETDates(item[path]);
		}
	});
}
