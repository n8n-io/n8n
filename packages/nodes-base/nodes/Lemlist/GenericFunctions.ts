import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

import { capitalCase } from 'change-case';

/**
 * Make an authenticated API request to Lemlist.
 */
export async function lemlistApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
) {
	const options: IRequestOptions = {
		headers: {},
		method,
		uri: `https://api.lemlist.com/api${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	return await this.helpers.requestWithAuthentication.call(this, 'lemlistApi', options);
}

/**
 * Make an authenticated API request to Lemlist and return all results.
 */
export async function lemlistApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	qs.limit = 100;
	qs.offset = 0;

	do {
		responseData = await lemlistApiRequest.call(this, method, endpoint, {}, qs);
		returnData.push(...(responseData as IDataObject[]));
		qs.offset += qs.limit;
	} while (responseData.length !== 0);
	return returnData;
}

export function getEvents() {
	const events = [
		'*',
		'emailsBounced',
		'emailsClicked',
		'emailsFailed',
		'emailsInterested',
		'emailsNotInterested',
		'emailsOpened',
		'emailsReplied',
		'emailsSendFailed',
		'emailsSent',
		'emailsUnsubscribed',
	];

	return events.map((event: string) => ({
		name: event === '*' ? '*' : capitalCase(event),
		value: event,
	}));
}
