import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, INodePropertyOptions, JsonObject, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const baseURL =
		resource === 'reportGA4'
			? 'https://analyticsdata.googleapis.com'
			: 'https://analyticsreporting.googleapis.com';

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
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
	} catch (error) {
		const errorData = (error.message || '').split(' - ')[1] as string;
		if (errorData) {
			const parsedError = JSON.parse(errorData.trim());
			const [message, ...rest] = parsedError.error.message.split('\n');
			const description = rest.join('\n');
			const httpCode = parsedError.error.code;
			throw new NodeApiError(this.getNode(), error, {message, description, httpCode});
		}
		throw new NodeApiError(this.getNode(), error, { message: error.message });
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const returnData: IDataObject[] = [];

	let responseData;

	if (resource === 'reportGA4') {
		let rows: IDataObject[] = [];
		query.limit = 100000;
		query.offset = 0;

		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		rows = rows.concat(responseData.rows);
		query.offset = rows.length;

		while (responseData.rowCount > rows.length) {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			rows = rows.concat(responseData.rows);
			query.offset = rows.length;
		}
		responseData.rows = rows;
		returnData.push(responseData);
	} else {
		do {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			if (body.reportRequests && Array.isArray(body.reportRequests)) {
				body.reportRequests[0]['pageToken'] = responseData[propertyName][0].nextPageToken;
			} else {
				body.pageToken = responseData['nextPageToken'];
			}
			returnData.push.apply(returnData, responseData[propertyName]);
		} while (
			(responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '') ||
			(responseData[propertyName] &&
				responseData[propertyName][0].nextPageToken &&
				responseData[propertyName][0].nextPageToken !== undefined)
		);
	}

	return returnData;
}

// tslint:disable-next-line:no-any
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
					data['total'] = row.metrics[0].values.join(',');
				}
			} else {
				data['total'] = row.metrics[0].values.join(',');
			}
			response.push(data);
		}
	}
	return response;
}

export function simplifyGA4(response: IDataObject) {
	if (!response.rows) return [];
	const dimensionHeaders = ((response.dimensionHeaders as IDataObject[]) || []).map(
		(header) => header.name as string,
	);
	const metricHeaders = ((response.metricHeaders as IDataObject[]) || []).map(
		(header) => header.name as string,
	);
	const returnData: IDataObject[] = [];

	(response.rows as IDataObject[]).forEach((row) => {
		if (!row) return;
		const returnRow: IDataObject = {};
		dimensionHeaders.forEach((dimension, index) => {
			returnRow[dimension] = (row.dimensionValues as IDataObject[])[index].value;
		});
		metricHeaders.forEach((metric, index) => {
			returnRow[metric] = (row.metricValues as IDataObject[])[index].value;
		});
		returnData.push(returnRow);
	});

	return returnData;
}

// tslint:disable-next-line:no-any
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

export function processFilters(expression: IDataObject): IDataObject[] {
	const processedFilters: IDataObject[] = [];

	Object.entries(expression as IDataObject).forEach((entry) => {
		const [filterType, filters] = entry;

		(filters as IDataObject[]).forEach((filter) => {
			const { fieldName } = filter;
			delete filter.fieldName;

			if (filterType === 'inListFilter') {
				filter.values = (filter.values as string).split(',');
			}

			if (filterType === 'numericFilter') {
				filter.value = {
					[filter.valueType as string]: filter.value,
				};
				delete filter.valueType;
			}

			if (filterType === 'betweenFilter') {
				filter.fromValue = {
					[filter.valueType as string]: filter.fromValue,
				};
				filter.toValue = {
					[filter.valueType as string]: filter.toValue,
				};
				delete filter.valueType;
			}

			processedFilters.push({
				filter: {
					fieldName,
					[filterType]: filter,
				},
			});
		});
	});

	return processedFilters;
}

export function sortLoadOptions(data: INodePropertyOptions[]) {
	const returnData = [...data];
	returnData.sort((a, b) => {
		const aName = (a.name as string).toLowerCase();
		const bName =( b.name as string).toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return returnData;
}
