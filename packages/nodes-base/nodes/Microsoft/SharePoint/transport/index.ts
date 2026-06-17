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
	const authentication = this.getNodeParameter('authentication', 0, 'oAuth2') as string;
	const credentialName =
		authentication === 'servicePrincipal'
			? 'microsoftSharePointServicePrincipalApi'
			: 'microsoftSharePointOAuth2Api';

	const credentials: { subdomain: string } = await this.getCredentials(credentialName);

	const options: IHttpRequestOptions = {
		method,
		url: url ?? `https://${credentials.subdomain}.sharepoint.com/_api/v2.0${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, credentialName, options);
}
