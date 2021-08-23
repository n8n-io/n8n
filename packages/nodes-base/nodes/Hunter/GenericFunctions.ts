import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject, NodeApiError, NodeOperationError, } from 'n8n-workflow';

export async function hunterApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('hunterApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	qs = Object.assign({ api_key: credentials.apiKey }, qs);
	let options: OptionsWithUri = {
		method,
		qs,
		body,
		uri: uri ||`https://api.hunter.io/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function hunterApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.offset = 0;
	query.limit = 100;

	do {
		responseData = await hunterApiRequest.call(this, method, resource, body, query);
		returnData.push(responseData[propertyName]);
		query.offset += query.limit;
	} while (
		responseData.meta !== undefined &&
		responseData.meta.results !== undefined &&
		responseData.meta.offset <= responseData.meta.results
	);
	return returnData;
}
