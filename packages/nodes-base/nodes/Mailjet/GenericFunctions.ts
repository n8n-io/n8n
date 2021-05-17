import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	NodeApiError,
} from 'n8n-workflow';

export async function mailjetApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const emailApiCredentials = await this.getCredentials('mailjetEmailApi');
	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.mailjet.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	if (emailApiCredentials !== undefined) {
		const base64Credentials = Buffer.from(`${emailApiCredentials.apiKey}:${emailApiCredentials.secretKey}`).toString('base64');
		options.headers!['Authorization'] = `Basic ${base64Credentials}`;
	} else {
		const smsApiCredentials = await this.getCredentials('mailjetSmsApi');
		options.headers!['Authorization'] = `Bearer ${smsApiCredentials!.token}`;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function mailjetApiRequestAllItems(this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.Limit = 1000;
	query.Offset = 0;

	do {
		responseData = await mailjetApiRequest.call(this, method, endpoint, body, query, undefined, { resolveWithFullResponse: true });
		returnData.push.apply(returnData, responseData.body);
		query.Offset = query.Offset + query.Limit;
	} while (
		responseData.length !== 0
	);
	return returnData;
}

export interface IMessage {
	From?: { Email?: string, Name?: string };
	Subject?: string;
	To?: IDataObject[];
	Cc?: IDataObject[];
	Bcc?: IDataObject[];
	Variables?: IDataObject;
	TemplateLanguage?: boolean;
	TemplateID?: number;
	HTMLPart?: string;
	TextPart?: string;
	TrackOpens?: string;
	ReplyTo?: IDataObject;
	TrackClicks?: string;
	Priority?: number;
}
