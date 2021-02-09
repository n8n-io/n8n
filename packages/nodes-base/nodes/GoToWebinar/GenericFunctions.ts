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
	body: IDataObject,
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

		// TODO
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
): Promise<any> { // tslint:disable-line:no-any

	// TODO

	// let responseData;
	// let startPosition = 1;
	// const maxResults = 1000;
	// const returnData: IDataObject[] = [];

	// const maxCount = await getCount.call(this, method, endpoint, qs);

	// const originalQuery = qs.query;

	// do {
	// 	qs.query = `${originalQuery} MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
	// 	responseData = await goToWebinarApiRequest.call(this, method, endpoint, qs, body);
	// 	returnData.push(...responseData.data);
	// 	startPosition += maxResults;

	// } while (maxCount > returnData.length);

	// return returnData;
}

export async function loadResource(
	this: ILoadOptionsFunctions,
	resource: string,
) {
	const returnData: INodePropertyOptions[] = [];

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const { oauthTokenData: { realmId } } = this.getCredentials('goToWebinarOAuth2Api') as { oauthTokenData: { realmId: string } };
	const endpoint = `/v3/company/${realmId}/query`;

	const resourceItems = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {});

	resourceItems.forEach((resourceItem: { DisplayName: string, Name: string, Id: string }) => {
		returnData.push({
			name: resourceItem.DisplayName || resourceItem.Name,
			value: resourceItem.Id,
		});
	});

	return returnData;
}
