import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

/**
 * Make an API request to Twilio
 *
 */
export async function twilioApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials<{
		accountSid: string;
		authType: 'authToken' | 'apiKey';
		authToken: string;
		apiKeySid: string;
		apiKeySecret: string;
	}>('twilioApi');

	if (query === undefined) {
		query = {};
	}

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		form: body,
		qs: query,
		uri: requestUrl`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${endpoint}`,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'twilioApi', options);
}

export async function twilioTriggerApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: FormData | IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IHttpRequestOptions> = {
		method,
		body,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		url: requestUrl`https://events.twilio.com/v1/${endpoint}`,
		json: true,
	};
	return await this.helpers.requestWithAuthentication.call(this, 'twilioApi', options);
}

const XML_CHAR_MAP: { [key: string]: string } = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	'"': '&quot;',
	"'": '&apos;',
};

export function escapeXml(str: string) {
	return str.replace(/[<>&"']/g, (ch: string) => {
		return XML_CHAR_MAP[ch];
	});
}
