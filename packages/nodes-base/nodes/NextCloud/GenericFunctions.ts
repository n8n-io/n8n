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

	options.uri = `${credentials.webDavUrl}/${encodeURI(endpoint)}`;

	if (resource === 'user' && operation === 'create') {
		options.uri = options.uri.replace('/remote.php/webdav', '');
	}

	if (resource === 'file' && operation === 'share') {
		options.uri = options.uri.replace('/remote.php/webdav', '');
	}

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
