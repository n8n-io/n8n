import {
	NodeApiError,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeListSearchItems,
	type INodeListSearchResult,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';

import type { ITimeInterval } from './Interfaces';

const addOptName = 'additionalOptions';
const possibleRootProperties = ['localPosts', 'reviews'];

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
	const body = Object.assign({}, opts.body) as IDataObject;
	const event = (body.event as IDataObject) ?? ({} as IDataObject);

	if (!params.startDateTime && !params.startDate && !params.endDateTime && !params.endDate) {
		return opts;
	}

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

	event.schedule = schedule;
	Object.assign(body, { event });
	opts.body = body;
	return opts;
}

/* Helper function adding update mask to the request */
export async function addUpdateMask(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalOptions = this.getNodeParameter('additionalOptions') as IDataObject;
	const propertyMapping: { [key: string]: string } = {
		postType: 'topicType',
		actionType: 'callToAction.actionType',
		url: 'callToAction.url',
		startDateTime: 'event.schedule.startDate,event.schedule.startTime',
		endDateTime: 'event.schedule.endDate,event.schedule.endTime',
		title: 'event.title',
		startDate: 'event.schedule.startDate',
		endDate: 'event.schedule.endDate',
		couponCode: 'offer.couponCode',
		redeemOnlineUrl: 'offer.redeemOnlineUrl',
		termsAndConditions: 'offer.termsAndConditions',
	};
	const updateMask = Object.keys(additionalOptions)
		.map((key) => propertyMapping[key] || key)
		.join(',');
	opts.qs = {
		...opts.qs,
		updateMask,
	};
	return opts;
}

/* Helper to handle pagination */
export async function handlePagination(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const aggregatedResult: IDataObject = {};
	let nextPageToken: string | undefined;
	let totalFetched = 0;
	const limit = this.getNodeParameter('limit', 0) as number;

	do {
		if (nextPageToken) {
			requestOptions.options.qs = { ...requestOptions.options.qs, pageToken: nextPageToken };
		}

		const responseData = await this.makeRoutingRequest(requestOptions);

		for (const page of responseData) {
			for (const prop of possibleRootProperties) {
				if (page.json[prop]) {
					if (!aggregatedResult[prop]) aggregatedResult[prop] = [] as IDataObject[];
					const currentData = page.json[prop] as IDataObject[];
					const availableSpace = limit - totalFetched;
					(aggregatedResult[prop] as IDataObject[]).push(...currentData.slice(0, availableSpace));
					totalFetched = (aggregatedResult[prop] as IDataObject[]).length;
				}
			}

			for (const key of Object.keys(page.json)) {
				if (key !== 'nextPageToken' && !possibleRootProperties.includes(key)) {
					aggregatedResult[key] = page.json[key];
				}
			}

			nextPageToken = page.json.nextPageToken as string | undefined;
			if (totalFetched >= limit) break;
		}

		if (totalFetched >= limit) break;
	} while (nextPageToken);

	const dataKey = possibleRootProperties.find((key) => aggregatedResult[key]);
	if (dataKey && aggregatedResult[dataKey]) {
		aggregatedResult[dataKey] = (aggregatedResult[dataKey] as IDataObject[]).slice(0, limit);
	}

	return [{ json: aggregatedResult }];
}

/* Helper function used in listSearch methods */
export async function googleApiRequest(
	this: ILoadOptionsFunctions | IPollFunctions,
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
		url: url ?? `https://mybusiness.googleapis.com/v4${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'googleMyBusinessOAuth2Api',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/* listSearch methods */
export async function searchAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Docs for this API call can be found here:
	// https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
	const query: IDataObject = {};
	if (paginationToken) {
		query.pageToken = paginationToken;
	}

	const responseData: IDataObject = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{
			pageSize: 20,
			...query,
		},
		'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
	);

	const accounts = responseData.accounts as Array<{ name: string }>;

	const results: INodeListSearchItems[] = accounts
		.map((a) => ({
			name: a.name,
			value: a.name,
		}))
		.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});

	return { results, paginationToken: responseData.nextPageToken };
}

export async function searchLocations(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Docs for this API call can be found here:
	// https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
	const query: IDataObject = {};
	if (paginationToken) {
		query.pageToken = paginationToken;
	}

	const account = (this.getNodeParameter('account') as IDataObject).value as string;

	const responseData: IDataObject = await googleApiRequest.call(
		this,
		'GET',
		'',
		{},
		{
			readMask: 'name',
			pageSize: 100,
			...query,
		},
		`https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations`,
	);

	const locations = responseData.locations as Array<{ name: string }>;

	const results: INodeListSearchItems[] = locations
		.map((a) => ({
			name: a.name,
			value: a.name,
		}))
		.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});

	return { results, paginationToken: responseData.nextPageToken };
}

export async function searchReviews(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: IDataObject = {};
	if (paginationToken) {
		query.pageToken = paginationToken;
	}

	const account = (this.getNodeParameter('account') as IDataObject).value as string;
	const location = (this.getNodeParameter('location') as IDataObject).value as string;

	const responseData: IDataObject = await googleApiRequest.call(
		this,
		'GET',
		`/${account}/${location}/reviews`,
		{},
		{
			pageSize: 50,
			...query,
		},
	);

	const reviews = responseData.reviews as Array<{ name: string }>;

	const results: INodeListSearchItems[] = reviews
		.map((a) => ({
			name: a.name,
			value: a.name,
		}))
		.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});

	return { results, paginationToken: responseData.nextPageToken };
}

export async function searchPosts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: IDataObject = {};
	if (paginationToken) {
		query.pageToken = paginationToken;
	}

	const account = (this.getNodeParameter('account') as IDataObject).value as string;
	const location = (this.getNodeParameter('location') as IDataObject).value as string;

	const responseData: IDataObject = await googleApiRequest.call(
		this,
		'GET',
		`/${account}/${location}/localPosts`,
		{},
		{
			pageSize: 100,
			...query,
		},
	);

	const localPosts = responseData.localPosts as Array<{ name: string }>;

	const results: INodeListSearchItems[] = localPosts
		.map((a) => ({
			name: a.name,
			value: a.name,
		}))
		.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});

	return { results, paginationToken: responseData.nextPageToken };
}
