import {
	NodeOperationError,
	requestPath,
	requestUrl,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IDataObject,
	type RequestPath,
} from 'n8n-workflow';

export function webDavPath(path: string): RequestPath {
	return path
		.split('/')
		.reduce(
			(parent, segment) =>
				segment === '' ? requestPath`${parent}/` : requestPath`${parent}/${segment}`,
			requestPath``,
		);
}

/**
 * Make an API request to NextCloud
 *
 */
export async function nextCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object | string | Buffer,
	headers?: IDataObject,
	encoding?: null,
	query?: IDataObject,
) {
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let credentials;

	if (authenticationMethod === 'accessToken') {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudApi');
	} else {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudOAuth2Api');
	}

	const options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
		headers,
		method,
		body,
		qs: query ?? {},
		json: false,
	};

	if (encoding === null) {
		options.encoding = null;
	}

	let baseUrl = credentials.webDavUrl;

	if (resource === 'user' && operation === 'create') {
		baseUrl = baseUrl.replace('/remote.php/webdav', '');
	}

	if (resource === 'file' && operation === 'share') {
		baseUrl = baseUrl.replace('/remote.php/webdav', '');
	}

	const requestOptions = { ...options, uri: requestUrl`${baseUrl}${endpoint}` };

	const credentialType =
		authenticationMethod === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api';

	const response = await this.helpers.requestWithAuthentication.call(
		this,
		credentialType,
		requestOptions,
	);

	if (typeof response === 'string' && response.includes('<b>Fatal error</b>')) {
		throw new NodeOperationError(
			this.getNode(),
			"NextCloud responded with a 'Fatal error', check description for more details",
			{
				description: `Server response:\n${response}`,
			},
		);
	}

	return response;
}
