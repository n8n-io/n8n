

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function wordpressApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('wordpressApi');

	let options: IHttpRequestOptions ={
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri || `${credentials!.url}/wp-json/wp/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body!).length === 0) {
		delete options.body;
	}
	try {
		const credentialType = 'wordpressApi';
		return this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function wordpressApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 10;
	query.page = 0;

	do {
		query.page++;
		responseData = await wordpressApiRequest.call(this, method, endpoint, body, query, undefined, { resolveWithFullResponse: true });
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers['x-wp-totalpages'] !== undefined &&
		responseData.headers['x-wp-totalpages'] !== '0' &&
		parseInt(responseData.headers['x-wp-totalpages'], 10) !== query.page
	);

	return returnData;
}
