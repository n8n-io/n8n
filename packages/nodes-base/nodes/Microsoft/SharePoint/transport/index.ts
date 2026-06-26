import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export type SharePointCredentialType =
	| 'microsoftSharePointOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftSharePointOAuth2Api` so existing workflows keep working
 * unchanged, while allowing the app-only `microsoftEntraServicePrincipalApi`
 * (Service Principal) credential to be selected.
 */
export function getSharePointCredentialType(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
): SharePointCredentialType {
	// `0` acts as itemIndex in execute context and as fallback in loadOptions/execute-single
	// context — `|| default` ensures both contexts return the OAuth2 type when unset.
	const selected = this.getNodeParameter('authentication', 0) as SharePointCredentialType;
	return selected || 'microsoftSharePointOAuth2Api';
}

export async function microsoftSharePointApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
	credentialType: SharePointCredentialType = 'microsoftSharePointOAuth2Api',
): Promise<any> {
	let baseUrl: string;

	if (credentialType === 'microsoftEntraServicePrincipalApi') {
		const credentials = await this.getCredentials('microsoftEntraServicePrincipalApi');
		baseUrl = (
			typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
				? credentials.graphApiBaseUrl
				: 'https://graph.microsoft.com'
		).replace(/\/+$/, '');
		baseUrl = `${baseUrl}/v1.0`;
	} else {
		const credentials = await this.getCredentials('microsoftSharePointOAuth2Api');
		baseUrl = `https://${credentials.subdomain as string}.sharepoint.com/_api/v2.0`;
	}

	const options: IHttpRequestOptions = {
		method,
		url: url ?? `${baseUrl}${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
}
