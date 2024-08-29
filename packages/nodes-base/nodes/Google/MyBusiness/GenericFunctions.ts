import {
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type JsonObject,
	type IExecuteSingleFunctions,
	type INodeExecutionData,
	type IN8nHttpFullResponse,
	NodeApiError,
} from 'n8n-workflow';

import type { ITimeInterval } from './Interfaces';

const addOptName = 'additionalOptions';

const getAllParams = (execFns: IExecuteSingleFunctions): Record<string, unknown> => {
	const params = execFns.getNode().parameters;
	const additionalOptions = execFns.getNodeParameter(addOptName, {}) as Record<string, unknown>;

	// Merge standard parameters with additional options from the node parameters
	return { ...params, ...additionalOptions };
};

/* Helper to adjust date-time parameters for API requests */
export async function handleDatesPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this);
	const body = Object.assign({}, opts.body);

	const createDateTimeObject = (dateString: string) => {
		const date = new Date(dateString);
		return {
			date: {
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1,
				day: date.getUTCDate(),
			},
			time: dateString.includes('T')
				? {
						hours: date.getUTCHours(),
						minutes: date.getUTCMinutes(),
						seconds: date.getUTCSeconds(),
						nanos: 0,
					}
				: undefined,
		};
	};

	// Convert start and end date-time parameters if provided
	const startDateTime =
		params.startDateTime || params.startDate
			? createDateTimeObject((params.startDateTime || params.startDate) as string)
			: null;
	const endDateTime =
		params.endDateTime || params.endDate
			? createDateTimeObject((params.endDateTime || params.endDate) as string)
			: null;

	const schedule: Partial<ITimeInterval> = {
		startDate: startDateTime?.date,
		endDate: endDateTime?.date,
		startTime: startDateTime?.time,
		endTime: endDateTime?.time,
	};

	Object.assign(body, { schedule });
	opts.body = body;
	return opts;
}

/* Helper to simplify the response */
export async function handleSimplifyPostReceive(
	this: IExecuteSingleFunctions,
	_: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	// If the response shouldn't be simplified, return the response body as is
	const simplify = this.getNodeParameter('simplify', 0) as boolean;
	if (!simplify) {
		return [{ json: response.body }] as INodeExecutionData[];
	}

	const possibleKeys = ['localPosts', 'reviews']; // Keys to search for in the response body

	// Find and return the first available key's data, if present
	const dataKey = possibleKeys.find((key) => response.body && (response.body as IDataObject)[key]);
	if (dataKey) {
		const data = (response.body as IDataObject)[dataKey] as IDataObject[];
		return data.length
			? (data.map((item: IDataObject) => ({ json: item })) as INodeExecutionData[])
			: ([{ json: {} }] as INodeExecutionData[]); // Always return an item
	}

	// If no valid key is found, return the response body as is
	return [{ json: response.body }] as INodeExecutionData[];
}

/* The following functions are used for the loadOptions as for them there is no support for declarative style pagination */
export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	url?: string,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: url || `https://mybusiness.googleapis.com/v4${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return (await this.helpers.requestOAuth2.call(
			this,
			'googleMyBusinessOAuth2Api',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	pageSize: number = 100,
	url?: string,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData;
	query.pageSize = pageSize;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, url);
		query.pageToken = responseData.nextPageToken;
		returnData.push(...(responseData[propertyName] as IDataObject[]));
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
