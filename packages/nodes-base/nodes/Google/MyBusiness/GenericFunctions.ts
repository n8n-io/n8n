import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
	IExecuteSingleFunctions,
	INodeExecutionData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

import { NodeApiError } from 'n8n-workflow';

import type { ILocalPost, ICallToAction, IReviewReply } from './Interfaces';

const addOptName = 'additionalOptions';

const getAllParams = (execFns: IExecuteSingleFunctions): Record<string, unknown> => {
	const params = execFns.getNode().parameters;
	const additionalOptions = execFns.getNodeParameter(addOptName, {}) as Record<string, unknown>;

	return { ...params, ...additionalOptions };
};

const formatParams = (
	obj: Record<string, unknown>,
	filters?: { [paramName: string]: (value: any) => boolean },
	mappers?: { [paramName: string]: (value: any) => any },
) => {
	return Object.fromEntries(
		Object.entries(obj)
			.filter(([name, value]) => !filters || (name in filters ? filters[name](value) : false))
			.map(([name, value]) =>
				!mappers || !(name in mappers) ? [name, value] : [name, mappers[name](value)],
			),
	);
};

/* Functions to map the requests and responses related to posts */
export async function createPostPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// Retrieve all parameters from the node
	const params = getAllParams(this);

	// Define the mappers for specific parameters
	const mappers = {
		// Map callToActionType and URL into the callToAction object
		actionType: (value: any) => ({
			actionType: value,
			url: params.url,
		}),
		// Map media items into an array of IMediaItem objects
		media: (value: any) =>
			(value || []).map((mediaItem: IDataObject) => ({
				mediaFormat: mediaItem.mediaFormat,
				sourceUrl: mediaItem.sourceUrl,
			})),
	};

	// Format the parameters using the formatParams function
	const body: ILocalPost = formatParams(
		params,
		{
			postType: (value) => ['standard', 'event', 'offer', 'alert'].includes(value as string),
			summary: (value) => typeof value === 'string' && value.trim().length > 0,
			languageCode: (value) => typeof value === 'string' && value.trim().length > 0,
			eventTitle: (value) => typeof value === 'string' && value.trim().length > 0,
			eventStartTime: (value) => typeof value === 'string' && value.trim().length > 0,
			eventEndTime: (value) => typeof value === 'string' && value.trim().length > 0,
			media: (value) => Array.isArray(value) && value.length > 0,
			actionType: (value) => typeof value === 'string' && value.trim().length > 0,
		},
		mappers,
	);

	// Assign the formatted body to the request options
	opts.body = body;

	// Return the modified request options
	return opts;
}

export async function getAllPostsPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	// If we shouldn't simplify the response, return the response body as is
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

export async function updatePostPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// Retrieve all parameters from the node
	const params = getAllParams(this);

	// Define the mappers for specific parameters
	const mappers = {
		// Map callToActionType and URL into the callToAction object
		actionType: (value: any) => ({
			actionType: value,
			url: params.url,
		}),
		// Map media items into an array of IMediaItem objects
		media: (value: any) =>
			(value || []).map((mediaItem: IDataObject) => ({
				mediaFormat: mediaItem.mediaFormat,
				sourceUrl: mediaItem.sourceUrl,
			})),
	};

	// Format the parameters using the formatParams function
	const body: ILocalPost = formatParams(
		params,
		{
			postType: (value) => ['standard', 'event', 'offer', 'alert'].includes(value as string),
			summary: (value) => typeof value === 'string' && value.trim().length > 0,
			languageCode: (value) => typeof value === 'string' && value.trim().length > 0,
			eventTitle: (value) => typeof value === 'string' && value.trim().length > 0,
			eventStartTime: (value) => typeof value === 'string' && value.trim().length > 0,
			eventEndTime: (value) => typeof value === 'string' && value.trim().length > 0,
			media: (value) => Array.isArray(value) && value.length > 0,
			actionType: (value) => typeof value === 'string' && value.trim().length > 0,
		},
		mappers,
	);

	opts.body = body;
	return opts;
}

/* Functions to map the requests and responses related to reviews */
export async function replyToReviewPreSend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const comment = this.getNodeParameter('comment', 0) as string;

	const body: IReviewReply = { comment };

	opts.body = body;
	return opts;
}

export async function getAllReviewsPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	// If we shouldn't simplify the response, return the response body as is
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
