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
	useWebDavEndpoint: boolean = true,
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let credentials;

	if (authenticationMethod === 'accessToken') {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudApi');
	} else {
		credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudOAuth2Api');
	}

	// Validate webDavUrl to catch credential corruption (empty, malformed, or no hostname etc.)
	const webDavUrl = credentials.webDavUrl ?? '';
	if (!URL.canParse(webDavUrl) || !/^https?:\/\//.test(webDavUrl)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid WebDAV URL in credentials: "${webDavUrl}". The URL must start with https:// or http://. Please check your Nextcloud credentials.`,
		);
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

	// For non-WebDAV requests, strip the WebDAV suffix while preserving any subpath prefix.
	const requestOptions = {
		...options,
		uri: useWebDavEndpoint
			? requestUrl`${webDavUrl}${endpoint}`
			: requestUrl`${webDavUrl.replace(/\/remote\.php\/webdav\/?$/, '')}/${endpoint}`,
	};

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
