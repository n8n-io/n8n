import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://analyticsreporting.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		if (body.reportRequests && Array.isArray(body.reportRequests)) {
			body.reportRequests[0].pageToken = responseData[propertyName][0].nextPageToken;
		} else {
			body.pageToken = responseData.nextPageToken;
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		(responseData.nextPageToken !== undefined && responseData.nextPageToken !== '') ||
		responseData[propertyName]?.[0].nextPageToken !== undefined
	);

	return returnData;
}

export function simplify(responseData: any | [any]) {
	const response = [];
	for (const {
		columnHeader: { dimensions },
		data: { rows },
	} of responseData) {
		if (rows === undefined) {
			// Do not error if there is no data
			continue;
		}
		for (const row of rows) {
			const data: IDataObject = {};
			if (dimensions) {
				for (let i = 0; i < dimensions.length; i++) {
					data[dimensions[i]] = row.dimensions[i];
					data.total = row.metrics[0].values.join(',');
				}
			} else {
				data.total = row.metrics[0].values.join(',');
			}
			response.push(data);
		}
	}
	return response;
}

export function merge(responseData: [any]) {
	const response: { columnHeader: IDataObject; data: { rows: [] } } = {
		columnHeader: responseData[0].columnHeader,
		data: responseData[0].data,
	};
	const allRows = [];
	for (const {
		data: { rows },
	} of responseData) {
		allRows.push(...rows);
	}
	response.data.rows = allRows as [];
	return [response];
}
