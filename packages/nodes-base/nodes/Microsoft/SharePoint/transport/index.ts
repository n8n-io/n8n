import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	RequestPath,
} from 'n8n-workflow';
import { NodeOperationError, requestUrl } from 'n8n-workflow';

export async function microsoftSharePointApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject | Buffer = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
): Promise<any> {
	const credentials: { subdomain: string } = await this.getCredentials(
		'microsoftSharePointOAuth2Api',
	);
	if (!url && !credentials.subdomain) {
		throw new NodeOperationError(this.getNode(), 'The SharePoint subdomain is not set', {
			description: 'Set the subdomain in the Microsoft SharePoint credential and try again.',
		});
	}

	if (
		url &&
		(!URL.canParse(url) ||
			new URL(url).origin !== new URL(`https://${credentials.subdomain}.sharepoint.com`).origin)
	) {
		throw new NodeOperationError(
			this.getNode(),
			'Refusing to send credentials to an unexpected host',
		);
	}

	const options = {
		method,
		json: true,
		headers,
		body,
		qs,
	};

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		'microsoftSharePointOAuth2Api',
		url
			? { ...options, url }
			: {
					...options,
					url: requestUrl`https://${credentials.subdomain}.sharepoint.com/_api/v2.0${endpoint}`,
				},
	);
}
