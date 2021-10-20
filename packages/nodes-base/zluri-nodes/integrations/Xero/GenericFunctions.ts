import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';
import { zluriOAuthApiRequest } from '../util';

export async function xeroApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://api.xero.com/api.xro/2.0${resource}`,
		json: true,
	};
	try {
		return await zluriOAuthApiRequest.call(this as IExecuteFunctions ,options)
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function xeroApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await xeroApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData[propertyName].length !== 0
	);

	return returnData;
}
