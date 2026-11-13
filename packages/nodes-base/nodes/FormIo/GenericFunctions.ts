import type {
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

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
	endpoint: RequestPath,
	body = {},
	qs = {},
): Promise<any> {
	const credentials = await this.getCredentials<IFormIoCredentials>('formIoApi');

	const base = credentials.domain || 'https://api.form.io';

	try {
		const options: WithRequestTarget<IHttpRequestOptions> = {
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			body,
			qs,
			url: requestUrl`${base}${endpoint}`,
			json: true,
		};

		return await this.helpers.httpRequestWithAuthentication.call(this, 'formIoApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
