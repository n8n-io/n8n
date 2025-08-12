import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export type Context = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

export function FormatDueDatetime(isoString: string): string {
	// Assuming that the problem with incorrect date format was caused by milliseconds
	// Replacing the last 5 characters of ISO-formatted string with just Z char
	return isoString.replace(new RegExp('.000Z$'), 'Z');
}

export async function todoistApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0) as string;

	const endpoint = 'api.todoist.com/rest/v2';

	const options: IRequestOptions = {
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
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function todoistSyncRequest(
	this: Context,
	body: any = {},
	qs: IDataObject = {},
	endpoint: string = '/sync',
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0, 'oAuth2');

	const options: IRequestOptions = {
		headers: {},
		method: 'POST',
		qs,
		uri: `https://api.todoist.com/sync/v9${endpoint}`,
		json: true,
	};

	if (Object.keys(body as IDataObject).length !== 0) {
		options.body = body;
	}

	try {
		const credentialType = authentication === 'oAuth2' ? 'todoistOAuth2Api' : 'todoistApi';
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
