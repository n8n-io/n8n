import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function storyblokApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('source', 0) as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: '',
		json: true,
	};

	options = Object.assign({}, options, option);

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	if (authenticationMethod === 'contentApi') {
		const credentials = await this.getCredentials('storyblokContentApi') as IDataObject;

		options.uri = `https://api.storyblok.com${resource}`;

		Object.assign(options.qs, { token: credentials.apiKey });
	} else {
		const credentials = await this.getCredentials('storyblokManagementApi') as IDataObject;

		options.uri = `https://mapi.storyblok.com${resource}`;

		Object.assign(options.headers, { 'Authorization': credentials.accessToken });
	}

	try {
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function storyblokApiRequestAllItems(this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;

	query.page = 1;

	do {
		responseData = await storyblokApiRequest.call(this, method, resource, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData[propertyName].length !== 0
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
