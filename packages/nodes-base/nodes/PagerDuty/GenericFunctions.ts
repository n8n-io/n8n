import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions, NodeApiError } from 'n8n-workflow';

import { snakeCase } from 'change-case';

export async function pagerDutyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/vnd.pagerduty+json;version=2',
		},
		method,
		body,
		qs: query,
		uri: uri || `https://api.pagerduty.com${resource}`,
		json: true,
		qsStringifyOptions: {
			arrayFormat: 'brackets',
		},
	};

	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}

	options.headers = Object.assign({}, options.headers, headers);

	try {
		if (authenticationMethod === 'apiToken') {
			const credentials = await this.getCredentials('pagerDutyApi');

			options.headers.Authorization = `Token token=${credentials.apiToken}`;

			return this.helpers.request!(options);
		} else {
			return this.helpers.requestOAuth2!.call(this, 'pagerDutyOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function pagerDutyApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await pagerDutyApiRequest.call(this, method, endpoint, body, query);
		query.offset++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.more);

	return returnData;
}

export function keysToSnakeCase(elements: IDataObject[] | IDataObject): IDataObject[] {
	if (!Array.isArray(elements)) {
		elements = [elements];
	}
	for (const element of elements) {
		for (const key of Object.keys(element)) {
			if (key !== snakeCase(key)) {
				element[snakeCase(key)] = element[key];
				delete element[key];
			}
		}
	}
	return elements;
}
