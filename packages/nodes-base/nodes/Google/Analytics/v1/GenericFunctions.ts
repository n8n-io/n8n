import type { OptionsWithUri } from 'request';
import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const baseURL = 'https://analyticsreporting.googleapis.com';

	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseURL}${endpoint}`,
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
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
	} catch (error) {
		const errorData = (error.message || '').split(' - ')[1] as string;
		if (errorData) {
			const parsedError = JSON.parse(errorData.trim());
			const [message, ...rest] = parsedError.error.message.split('\n');
			const description = rest.join('\n');
			const httpCode = parsedError.error.code;
			throw new NodeApiError(this.getNode(), error, { message, description, httpCode });
		}
		throw new NodeApiError(this.getNode(), error, { message: error.message });
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		if (body.reportRequests && Array.isArray(body.reportRequests)) {
			(body.reportRequests as IDataObject[])[0].pageToken =
				responseData[propertyName][0].nextPageToken;
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
		columnHeader: { dimensions, metricHeader },
		data: { rows },
	} of responseData) {
		if (rows === undefined) {
			// Do not error if there is no data
			continue;
		}
		const metrics = metricHeader.metricHeaderEntries.map((entry: { name: string }) => entry.name);
		for (const row of rows) {
			const data: IDataObject = {};
			if (dimensions) {
				for (let i = 0; i < dimensions.length; i++) {
					data[dimensions[i]] = row.dimensions[i];
					for (const [index, metric] of metrics.entries()) {
						data[metric] = row.metrics[0].values[index];
					}
				}
			} else {
				for (const [index, metric] of metrics.entries()) {
					data[metric] = row.metrics[0].values[index];
				}
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
