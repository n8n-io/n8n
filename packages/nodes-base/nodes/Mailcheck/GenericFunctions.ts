import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
<<<<<<< HEAD
import { OperationalError } from 'n8n-workflow';
=======
import { OperationalError } from '@n8n/errors';
import { requestUrl } from 'n8n-workflow';
>>>>>>> 9d82d35cb (chore: Bundle/2.x (#43761))

export async function mailCheckApiRequest(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('mailcheckApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method,
		body,
		qs,
		uri: requestUrl`https://api.mailcheck.co/v1${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response?.body?.message) {
			// Try to return the error prettier
			throw new OperationalError(
				`Mailcheck error response [${error.statusCode}]: ${error.response.body.message}`,
				{ level: 'warning' },
			);
		}
		throw error;
	}
}
