import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export function FormatDueDatetime(isoString: string): string {
	// Assuming that the problem with incorrect date format was caused by milliseconds
	// Replacing the last 5 characters of ISO-formatted string with just Z char
	return isoString.replace(new RegExp('.000Z$'), 'Z');
}

export async function todoistApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey');

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		uri: `https://${endpoint}${resource}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		if (authentication === 'apiKey') {
			const credentials = await this.getCredentials('todoistApi') as IDataObject;

			//@ts-ignore
			options.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
			return this.helpers.request!(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'todoistOAuth2Api', options);
		}

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
