import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export async function microsoftSharePointApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
): Promise<any> {
	// Legacy credentials may lack the subdomain (it only recently became required).
	const credentials: { subdomain?: string } = await this.getCredentials(
		'microsoftSharePointOAuth2Api',
	);

	const options: IHttpRequestOptions = {
		method,
		url:
			url ?? `https://${(credentials.subdomain ?? '').trim()}.sharepoint.com/_api/v2.0${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		'microsoftSharePointOAuth2Api',
		options,
	);
}
