import type {
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

interface IFormIoCredentials {
	environment: 'cloudHosted' | ' selfHosted';
	domain?: string;
	email: string;
	password: string;
}

/**
 * Method will call register or list webhooks based on the passed method in the parameter
 */
export async function formIoApiRequest(
	this: IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body = {},
	qs = {},
): Promise<any> {
	const credentials = await this.getCredentials<IFormIoCredentials>('formIoApi');

	const base = credentials.domain || 'https://api.form.io';

	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: `${base}${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'formIoApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
