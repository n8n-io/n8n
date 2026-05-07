import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function gumroadApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;

	let options: IRequestOptions = {
		method,
		qs,
		body,
		uri: uri || `https://api.gumroad.com/v2${resource}`,
		json: true,
	};

	if (authenticationMethod === 'accessToken') {
		const credentials = await this.getCredentials('gumroadApi');
		options.body = Object.assign({ access_token: credentials.accessToken }, body);
	}

	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'oAuth2') {
			return await this.helpers.requestOAuth2.call(this, 'gumroadOAuth2Api', options);
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
