import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

export async function mailjetApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const emailApiCredentials = await this.getCredentials('mailjetEmailApi') as { apiKey: string, secretKey: string, sandboxMode: boolean };
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
		const { sandboxMode } = emailApiCredentials;
		Object.assign(body, { SandboxMode: sandboxMode });
		options.auth = {
			username: emailApiCredentials.apiKey,
			password: emailApiCredentials.secretKey,
		};
	} else {
		const smsApiCredentials = await this.getCredentials('mailjetSmsApi');
		options.headers!['Authorization'] = `Bearer ${smsApiCredentials!.token}`;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
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

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> { // tslint:disable-line:no-any
	const credentials = decryptedCredentials;

	const {
		apiKey,
		secretKey,
	} = credentials as {
		apiKey: string,
		secretKey: string,
	};

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		auth: {
			username: apiKey,
			password: secretKey,
		},
		method: 'GET',
		uri: `https://api.mailjet.com/v3/REST/template`,
		json: true,
	};

	return await this.helpers.request(options);
}

export function validateJSON(json: string | undefined): IDataObject | undefined { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
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
