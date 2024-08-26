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

	return { ...params, ...additionalOptions };
};

/* The following functions are used to map the requests and responses */
// ToDo
export async function handleDatesPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// Retrieve all parameters from the node
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

	const startDateTime = params.startDateTime
		? createDateTimeObject(params.startDateTime as string)
		: null;
	const endDateTime = params.endDateTime
		? createDateTimeObject(params.endDateTime as string)
		: null;

	const schedule: Partial<ITimeInterval> = {};

	// ToDo: Refactor the following code
	if (startDateTime?.date) {
		schedule.startDate = startDateTime.date;
	}
	if (startDateTime?.time) {
		schedule.startTime = startDateTime.time!;
	}
	if (endDateTime?.date) {
		schedule.endDate = endDateTime.date;
	}
	if (endDateTime?.time) {
		schedule.endTime = endDateTime.time!;
	}

	if (params.startDate && !params.startDateTime) {
		const startDate = createDateTimeObject(params.startDate as string);
		schedule.startDate = startDate.date;
	}

	if (params.endDate && !params.endDateTime) {
		const endDate = createDateTimeObject(params.endDate as string);
		schedule.endDate = endDate.date;
	}

	Object.assign(body, { schedule });
	opts.body = body;
	return opts;
}

// ToDo: Duplicate code for simplification
export async function getAllPostsPostReceive(
	this: IExecuteSingleFunctions,
	_: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	// If the response shouldn't be simplified, return the response body as is
	const simplify = this.getNodeParameter('simplify', 0) as boolean;
	if (!simplify) {
		return [{ json: response.body }] as INodeExecutionData[];
	}

	// Check if the response body contains localPosts
	if (response.body && (response.body as IDataObject).localPosts) {
		// Map the localPosts to the node execution data format
		const executionData: INodeExecutionData[] = (
			(response.body as IDataObject).localPosts as IDataObject[]
		).map((post: IDataObject) => {
			return {
				json: post,
			};
		});
		return executionData;
	}

	// If no localPosts are found, return an empty array
	return [];
}

export async function getAllReviewsPostReceive(
	this: IExecuteSingleFunctions,
	_: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	// If response shouldn't be simplified, return the response body as is
	const simplify = this.getNodeParameter('simplify', 0) as boolean;
	if (!simplify) {
		return [{ json: response.body }] as INodeExecutionData[];
	}

	// Check if the response body contains reviews
	if (response.body && (response.body as IDataObject).reviews) {
		// Map the reviews to the node execution data format
		const executionData: INodeExecutionData[] = (
			(response.body as IDataObject).reviews as IDataObject[]
		).map((review: IDataObject) => {
			return {
				json: review,
			};
		});
		return executionData;
	}

	// If no reviews are found, return an empty array
	return [];
}

/* The following functions are used for the loadOptions as for them there is no support for declarative style pagination */
export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	url?: string,
	headers: IDataObject = {},
): Promise<any> {
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
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(this, 'googleMyBusinessOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
