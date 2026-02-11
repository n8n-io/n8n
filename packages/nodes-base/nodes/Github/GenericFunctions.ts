import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { httpClient } from 'n8n-core';

/**
 * Make an API request to Github
 */
export async function githubApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	_option: IDataObject = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;

	const credentialType = authenticationMethod === 'accessToken' ? 'githubApi' : 'githubOAuth2Api';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (credentials.server as string) || 'https://api.github.com';

	return httpClient(this)
		.baseUrl(baseUrl)
		.endpoint(endpoint)
		.method(method)
		.body(body as IDataObject)
		.query(query ?? {})
		.headers({ 'User-Agent': 'n8n' })
		.withAuthentication(credentialType)
		.execute();
}

/**
 * Returns the SHA of the given file
 */
export async function getFileSha(
	this: IHookFunctions | IExecuteFunctions,
	owner: string,
	repository: string,
	filePath: string,
	branch?: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const query: IDataObject = {};
	if (branch !== undefined) {
		query.ref = branch;
	}

	const getEndpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
	const responseData = (await githubApiRequest.call(
		this,
		'GET',
		getEndpoint,
		{},
		query,
	)) as IDataObject;

	if (responseData.sha === undefined) {
		throw new NodeOperationError(this.getNode(), 'Could not get the SHA of the file.');
	}
	return responseData.sha;
}

export async function githubApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object = {},
	query: IDataObject = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;

	const credentialType = authenticationMethod === 'accessToken' ? 'githubApi' : 'githubOAuth2Api';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (credentials.server as string) || 'https://api.github.com';

	return httpClient(this)
		.baseUrl(baseUrl)
		.endpoint(endpoint)
		.method(method)
		.body(body as IDataObject)
		.query(query)
		.headers({ 'User-Agent': 'n8n' })
		.withAuthentication(credentialType)
		.withPagination({ strategy: 'link-header', itemsPath: '', pageSize: 100 })
		.executeAll();
}

export function isBase64(content: string) {
	const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
	return base64regex.test(content);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
