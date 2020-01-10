import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function salesforceApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('salesforceApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'password',
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			username: credentials.username,
			password: credentials.password,
			format: 'json',
		},
		uri: 'https://login.salesforce.com/services/oauth2/token',
		json: true
	};
	let authentication;
	try {
		authentication = await this.helpers.request!(options);
	} catch (error) {
		throw new Error(error);
	}

	options = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authentication.access_token}`,
		},
		method,
		qs,
		body,
		uri: uri ||`${authentication.instance_url}/services/data/v39.0${resource}`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(error);
	}
}

export async function salesforceApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		responseData = await salesforceApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData.nextRecordsUrl;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.nextRecordsUrl !== undefined &&
		responseData.nextRecordsUrl !== null
	);

	return returnData;
}
