import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated API request to GoToWebinar.
 */
export async function goToWebinarApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject | IDataObject[],
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: `https://api.getgo.com/G2W/rest/v2/${endpoint}`,
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

	try {
		console.log(options);
		return await this.helpers.requestOAuth2!.call(this, 'goToWebinarOAuth2Api', options);

	} catch (error) {

		if (error.statusCode === 403) {
			throw new Error('The Go To Webinar credentials are invalid!');
		}

		if (error.statusCode && error?.error?.description) {
			throw new Error(`Go To Webinar error response [${error.statusCode}]: ${error.error.description}`);
		}

		throw error;
	}
}

/**
 * Make an authenticated API request to GoToWebinar and return all results.
 */
export async function goToWebinarApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	resource: string,
): Promise<any> { // tslint:disable-line:no-any

	const resourceToResponseKey: { [key: string]: string } = {
		session: 'sessionInfoResources',
		webinar: 'webinars',
	};

	const key = resourceToResponseKey[resource];

	let returnData: IDataObject[] = [];
	let responseData;

	do {
		responseData = await goToWebinarApiRequest.call(this, method, endpoint, qs, body);

		if (!responseData.page.totalElements) {
			return [];
		} else if (responseData._embedded && responseData._embedded[key]) {
			returnData.push(...responseData._embedded[key]);
		} else {
			returnData.push(...responseData);
		}

		if (qs.limit && returnData.length >= qs.limit) {
			returnData = returnData.splice(0, qs.limit as number);
			return returnData;
		}

	} while (
		responseData.totalElements && responseData.totalElements > returnData.length
	);

	return returnData;
}

export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: string,
) {
	const returnData: INodePropertyOptions[] = [];

	// const qs = {
	// 	query: `SELECT * FROM ${resource}`,
	// } as IDataObject;

	// const { oauthTokenData: { realmId } } = this.getCredentials('goToWebinarOAuth2Api') as { oauthTokenData: { realmId: string } };
	// const endpoint = `/v3/company/${realmId}/query`;

	// const resourceItems = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

	// resourceItems.forEach((resourceItem: { DisplayName: string, Name: string, Id: string }) => {
	// 	returnData.push({
	// 		name: resourceItem.DisplayName || resourceItem.Name,
	// 		value: resourceItem.Id,
	// 	});
	// });

	return returnData;
}
