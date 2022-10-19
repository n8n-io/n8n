import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, JsonObject, NodeApiError } from 'n8n-workflow';

export async function mailjetApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;

	let credentialType;

	if (resource === 'email' || this.getNode().type.includes('Trigger')) {
		credentialType = 'mailjetEmailApi';
		const { sandboxMode } = (await this.getCredentials('mailjetEmailApi')) as {
			sandboxMode: boolean;
		};

		if (!this.getNode().type.includes('Trigger')) {
			Object.assign(body, { SandboxMode: sandboxMode });
		}
	} else {
		credentialType = 'mailjetSmsApi';
	}

	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.mailjet.com${path}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function mailjetApiRequestAllItems(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.Limit = 1000;
	query.Offset = 0;

	do {
		responseData = await mailjetApiRequest.call(this, method, endpoint, body, query, undefined, {
			resolveWithFullResponse: true,
		});
		returnData.push.apply(returnData, responseData.body);
		query.Offset = query.Offset + query.Limit;
	} while (responseData.length !== 0);
	return returnData;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): IDataObject | undefined {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

export interface IMessage {
	From?: { Email?: string; Name?: string };
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
