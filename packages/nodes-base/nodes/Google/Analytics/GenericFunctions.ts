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
	// tslint:disable-line:no-any
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
	body: any = {},
	query: IDataObject = {},
	uri?: string,
): Promise<any> {
	// tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

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
		const metrics = metricHeader.metricHeaderEntries.map(
			(entry: { name: string }) => entry.name as string,
		);
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
	// tslint:disable-line:no-any
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

function sortLoadOptions(data: INodePropertyOptions[]) {
	const returnData = [...data];
	returnData.sort((a, b) => {
		const aName = (a.name as string).toLowerCase();
		const bName = (b.name as string).toLowerCase();
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

export async function getDimensions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items: dimensions } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
	);

	for (const dimesion of dimensions) {
		if (dimesion.attributes.type === 'DIMENSION' && dimesion.attributes.status !== 'DEPRECATED') {
			returnData.push({
				name: dimesion.attributes.uiName,
				value: dimesion.id,
				description: dimesion.attributes.description,
			});
		}
	}
	return sortLoadOptions(returnData);
}

export async function getMetrics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items: metrics } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/metadata/ga/columns',
	);

	for (const metric of metrics) {
		if (metric.attributes.type === 'METRIC' && metric.attributes.status !== 'DEPRECATED') {
			returnData.push({
				name: metric.attributes.uiName,
				value: metric.id,
				description: metric.attributes.description,
			});
		}
	}
	return sortLoadOptions(returnData);
}

export async function getViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const { items } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://www.googleapis.com/analytics/v3/management/accounts/~all/webproperties/~all/profiles',
	);

	for (const item of items) {
		returnData.push({
			name: item.name,
			value: item.id,
			description: item.websiteUrl,
		});
	}

	return sortLoadOptions(returnData);
}

export async function getProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const { accounts } = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		'https://analyticsadmin.googleapis.com/v1alpha/accounts',
	);

	for (const acount of accounts || []) {
		const { properties } = await googleApiRequest.call(
			this,
			'GET',
			'',
			{},
			{ filter: `parent:${acount.name}` },
			`https://analyticsadmin.googleapis.com/v1alpha/properties`,
		);

		if (properties && properties.length > 0) {
			for (const property of properties) {
				returnData.push({
					name: property.displayName,
					value: property.name,
				});
			}
		}
	}
	return sortLoadOptions(returnData);
}

export async function getDimensionsGA4(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const propertyId = this.getCurrentNodeParameter('propertyId');
	const { dimensions } = await googleApiRequest.call(
		this,
		'GET',
		`/v1beta/${propertyId}/metadata`,
		{},
		{ fields: 'dimensions' },
	);

	for (const dimesion of dimensions) {
		returnData.push({
			name: dimesion.uiName as string,
			value: dimesion.apiName as string,
			description: dimesion.description as string,
		});
	}
	return sortLoadOptions(returnData);
}

export async function getMetricsGA4(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const propertyId = this.getCurrentNodeParameter('propertyId');
	const { metrics } = await googleApiRequest.call(
		this,
		'GET',
		`/v1beta/${propertyId}/metadata`,
		{},
		{ fields: 'metrics' },
	);

	for (const metric of metrics) {
		returnData.push({
			name: metric.uiName as string,
			value: metric.apiName as string,
			description: metric.description as string,
		});
	}
	return sortLoadOptions(returnData);
}

export function prepareDateRange(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	period: string,
	itemIndex: number,
) {
	const dateRanges: IDataObject[] = [];

	switch (period) {
		case 'today':
			dateRanges.push({
				startDate: DateTime.local().startOf('day').toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'yesterday':
			dateRanges.push({
				startDate: DateTime.local().startOf('day').minus({ days: 1 }).toISODate(),
				endDate: DateTime.local().endOf('day').minus({ days: 1 }).toISODate(),
			});
			break;
		case 'lastCalendarWeek':
			dateRanges.push({
				startDate: DateTime.local().startOf('week').toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'lastCalendarMonth':
			dateRanges.push({
				startDate: DateTime.local().startOf('month').toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'last7days':
			dateRanges.push({
				startDate: DateTime.now().minus({ days: 7 }).toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'last30days':
			dateRanges.push({
				startDate: DateTime.now().minus({ days: 30 }).toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'custom':
			const start = DateTime.fromISO(this.getNodeParameter('startDate', itemIndex, '') as string);
			const end = DateTime.fromISO(this.getNodeParameter('endDate', itemIndex, '') as string);

			if (start > end) {
				throw new NodeOperationError(
					this.getNode(),
					`Parameter Start: ${start.toISO()} cannot be after End: ${end.toISO()}`,
				);
			}

			dateRanges.push({
				startDate: start.toISODate(),
				endDate: end.toISODate(),
			});

			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The period '${period}' is not supported, to specify own period use 'custom' option`,
			);
	}

	return dateRanges;
}

export const defaultStartDate = () => DateTime.now().startOf('day').minus({ days: 8 }).toISO();

export const defaultEndDate = () => DateTime.now().startOf('day').minus({ days: 1 }).toISO();

export function checkDuplicates(
	this: IExecuteFunctions,
	data: IDataObject[],
	key: string,
	type: string,
) {
	const fields = data.map((item) => item[key] as string);
	const duplicates = fields.filter((field, i) => fields.indexOf(field) !== i);
	const unique = Array.from(new Set(duplicates));
	if (unique.length) {
		throw new NodeOperationError(
			this.getNode(),
			`Duplicates for ${type} found: ${unique.join(', ')}`,
		);
	}
}
