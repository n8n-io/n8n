import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

/**
 * Make an API request to Twilio
 *
 */
export async function twilioApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = (await this.getCredentials('twilioApi')) as {
		accountSid: string;
		authType: 'authToken' | 'apiKey';
		authToken: string;
		apiKeySid: string;
		apiKeySecret: string;
	};

	if (query === undefined) {
		query = {};
	}

	const options: IRequestOptions = {
		method,
		form: body,
		qs: query,
		uri: `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${endpoint}`,
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
