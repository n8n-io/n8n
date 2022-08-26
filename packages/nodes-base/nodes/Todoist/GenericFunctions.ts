import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export type Context = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

export function FormatDueDatetime(isoString: string): string {
	// Assuming that the problem with incorrect date format was caused by milliseconds
	// Replacing the last 5 characters of ISO-formatted string with just Z char
	return isoString.replace(new RegExp('.000Z$'), 'Z');
}

export async function todoistApiRequest(
	this: Context,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0) as string;

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		method,
		qs,
		uri: `https://${endpoint}${resource}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const credentialType = authentication === 'apiKey' ? 'todoistApi' : 'todoistOAuth2Api';
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function todoistSyncRequest(
	this: Context,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0, 'oAuth2');

	const options: OptionsWithUri = {
		headers: {},
		method: 'POST',
		qs,
		uri: `https://api.todoist.com/sync/v8/sync`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const credentialType = authentication === 'oAuth2' ? 'todoistOAuth2Api' : 'todoistApi';
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
