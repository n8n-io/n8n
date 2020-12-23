import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import {
	IDataObject
} from 'n8n-workflow';

export async function microsoftApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}, option: IDataObject = { json: true }): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://graph.microsoft.com/v1.0/me${resource}`,
	};
	try {
        Object.assign(options, option);
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'microsoftOutlookOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error && error.response.body.error.message) {
			// Try to return the error prettier
			throw new Error(`Microsoft error response [${error.statusCode}]: ${error.response.body.error.message}`);
		}
		throw error;
	}
}

export async function microsoftApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query['$top'] = 100;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['@odata.nextLink'] !== undefined
	);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query['$top'] = 100;
	query['$skip'] = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query['$skip'] += query['$top'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['value'].length !== 0
	);

	return returnData;
}

export function makeRecipient(email: string) {
	return {
		emailAddress: {
			address: email,
		},
	};
}

export function createMessage(fields: IDataObject) {
	const message : IDataObject = {};

	// Create body object
	if (fields.bodyContent || fields.bodyContentType) {
		const bodyObject = {
			content: fields.bodyContent,
			contentType: fields.bodyContentType,
		};

		message["body"] = bodyObject;
		delete fields["bodyContent"];
		delete fields["bodyContentType"];
	}

	// Handle custom headers
	if ('internetMessageHeaders' in fields && 'headers' in (fields.internetMessageHeaders as IDataObject)) {
		fields.internetMessageHeaders = (fields.internetMessageHeaders as IDataObject).headers;
	}

	// Handle recipient fields
	['bccRecipients', 'ccRecipients', 'from', 'replyTo', 'sender', 'toRecipients'].forEach(key => {
		if (Array.isArray(fields[key]))
			fields[key] = (fields[key] as Array<string>).map(email => makeRecipient(email));
		else if (fields[key] !== undefined)
			fields[key] = makeRecipient(fields[key] as string);
	});
	Object.assign(message, fields);

	return message;
}