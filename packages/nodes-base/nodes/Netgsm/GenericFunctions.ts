import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

/**
 * Make an API request to Netgsm
 *
 */
export async function netgsmApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		body,
		headers: {
			'Content-Type': 'application/json',
		},
		url: `https://api.netgsm.com.tr/sms/rest/v2/${endpoint}`,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'netgsmApi', options);
}
