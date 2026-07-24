import {
	NodeOperationError,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to NextCloud
 *
 */
export async function nextCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
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
	try {
		const parsed = new URL(webDavUrl);
		if (!parsed.hostname) {
			throw new Error('No hostname');
		}
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid WebDAV URL in credentials: "${webDavUrl}". The URL must start with https:// or http://. Please check your Nextcloud credentials.`,
		);
	}
	if (!webDavUrl || !/^https?:\/\//.test(webDavUrl)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid WebDAV URL in credentials: "${webDavUrl}". The URL must start with https:// or http://. Please check your Nextcloud credentials.`,
		);
	}

	const options: IRequestOptions = {
		headers,
		method,
		body,
		qs: query ?? {},
		uri: '',
		json: false,
	};

	if (encoding === null) {
		options.encoding = null;
	}

	// Preserve the existing WebDAV path behavior: endpoints may start with '/', producing '//'.
	// For non-WebDAV requests, strip the WebDAV suffix while preserving any subpath prefix.
	options.uri = useWebDavEndpoint
		? `${webDavUrl}/${encodeURI(endpoint)}`
		: `${webDavUrl.replace(/\/remote\.php\/webdav\/?$/, '')}/${encodeURI(endpoint)}`;

	const credentialType =
		authenticationMethod === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api';

	const response = await this.helpers.requestWithAuthentication.call(this, credentialType, options);

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
