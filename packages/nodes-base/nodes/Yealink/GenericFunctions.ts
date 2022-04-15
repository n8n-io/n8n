import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import * as crypto from 'crypto';

import { v4 as uuidv4 } from 'uuid';

export async function yealinkApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string, endpoint: string, body: IDataObject = {}, qs: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	// Make http request according to "Yealink Json API for RPS Management Platform Version 3.6.0.30 I January 2021"
	// Useful blogs:
	// https://automationadmin.com/2019/10/yealink-rest-api
	// https://automationadmin.com/2020/02/learning-rest-api-examples

	try {
		// Get credentials the user provided for this node
		const credentials = await this.getCredentials('yealinkApi') as IDataObject;
		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		// Get key/secret
		const key = credentials.xCaKey as string;
		const secret = credentials.secret as string;

		// Set API URI variable
		uri = uri || `${credentials.url}/${endpoint}`;

		// Generate UUID
		const guid = uuidv4()
			.replace(/-/g,''); // remove "-"

		// Get unix timestamp in ms
		const timestamp = Date.now();

		let options: OptionsWithUri;
		// When the Body is null (the content-Length is 0), the Content-MD5 is not required in the header
		if (method === 'GET') {
		// if (Object.keys(body).length === 0) {

			// Generate string for signing
			let sigString = method + '\n' +
				'X-Ca-Key:' + key + '\n' +
				'X-Ca-Nonce:' + guid + '\n' +
				'X-Ca-Timestamp:' + timestamp + '\n' +
				endpoint;

			// Add query string parameters to the sigString if they exist
			if (Object.keys(qs).length !== 0) {
				let formattedQFStr = '';
				for (const [key, value] of Object.entries(qs)) {
					formattedQFStr += `${key}=${value}&`;
				}
				formattedQFStr = formattedQFStr.substring(0, formattedQFStr.lastIndexOf('&')); // remove last "&"

				sigString += '\n' + formattedQFStr;
			}

			// Create the signature
			const sign = crypto.createHmac('sha256', secret).update(sigString).digest('base64');

			options = {
				method,
				headers: {
					'X-Ca-Key': key,
					'X-Ca-Nonce': guid,
					'X-Ca-Timestamp': timestamp,
					'X-Ca-Signature': sign,
					'Content-Type': 'application/json',
					'Charset': 'UTF-8',
				},
				qs,
				uri,
				json: true,
			};

			if (Object.keys(options.qs).length === 0) {
				delete options.qs;
			}

		} else {
			// Generate Content MD5
			const contentMd5 = crypto.createHash('md5').update(JSON.stringify(body)).digest('base64');

			// Generate string for signing
			const sigString = method + '\n' +
				'Content-MD5:' + contentMd5 + '\n' +
				'X-Ca-Key:' + key + '\n' +
				'X-Ca-Nonce:' + guid + '\n' +
				'X-Ca-Timestamp:' + timestamp + '\n' +
				endpoint;

			// Create the signature
			const sign = crypto.createHmac('sha256', secret).update(sigString).digest('base64');

			options = {
				method,
				headers: {
					'Content-MD5': contentMd5,
					'X-Ca-Key': key,
					'X-Ca-Nonce': guid,
					'X-Ca-Timestamp': timestamp,
					'X-Ca-Signature': sign,
					'Content-Type': 'application/json',
					'Charset': 'UTF-8',
				},
				body,
				uri,
				json: true,
			};
		}
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function yealinkApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IDataObject = {}, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];
	let responseData;
	body.limit = 1000;
	body.skip = 0;

	do {
		responseData = await yealinkApiRequest.call(this, method, endpoint, body);
		returnData.push.apply(returnData, simplify(responseData) as IDataObject[]);
		body.skip += body.limit;
	} while (
		// until the retrieved records are 0
		responseData['ret'] !== 0 ||
		responseData['total'] !== 0
		// responseData['data']['total'] !== 0
		);

	return returnData;
}

/**
 * Simplifies the output
 *
 * @export
 * @param IDataObject responseData
 * @returns string|IDataObject|IDataObject[]
 */
export function simplify(responseData: IDataObject): string|IDataObject|IDataObject[] {
	const property = 'data';

	if (typeof responseData[property] === 'string') {
		// if the 'data' property is string return just it and skip other properties
		return {[property]: responseData[property] as string};
	}

	while (responseData[property] !== undefined ) { //&& Object.keys(responseData[property] as IDataObject).length !== 0
		// if the 'data' property is not empty and it consists other 'data properties', get the innermost 'data'
		responseData = responseData[property] as IDataObject;
	}

	// return the data
	return responseData as IDataObject;
}
