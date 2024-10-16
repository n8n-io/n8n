import {
	NodeApiError,
	NodeOperationError,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IDataObject,
  } from 'n8n-workflow';
  
  /**
   * Make an API request to Nextcloud
   *
   * @param {IHookFunctions | IExecuteFunctions} this
   * @param {IHttpRequestMethods} method
   * @param {string} endpoint
   * @param {object | string | Buffer} body
   * @param {IDataObject} [headers]
   * @param {null | undefined} [encoding]
   * @param {IDataObject} [query]
   * @returns {Promise<any>}
   * @throws {NodeOperationError}
   */
  export async function nextCloudApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object | string | Buffer,
	headers: IDataObject = {},
	encoding?: null | undefined,
	query?: IDataObject,
  ) {
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	const authenticationMethod = this.getNodeParameter('authentication', 0);
  
	let credentials;
	if (authenticationMethod === 'accessToken') {
	  credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudApi');
	} else {
	  credentials = await this.getCredentials<{ webDavUrl: string }>('nextCloudOAuth2Api');
	}
  
	const options: IRequestOptions = {
	  headers: {
		...headers,
	  },
	  method,
	  body,
	  qs: query ?? {},
	  uri: '',
	  json: headers['Content-Type'] === 'application/json',
	};
  
	if (encoding === null) {
	  options.encoding = null;
	}
  
	options.uri = `${credentials.webDavUrl}/${endpoint}`;
  
	if (
	  ['user', 'deck', 'notes', 'tables', 'talk'].includes(resource) ||
	  (resource === 'file' && operation === 'share')
	) {
	  options.uri = options.uri.replace('/remote.php/webdav', '');
	}
  
	options.uri = encodeURI(options.uri);
  
	const credentialType =
	  authenticationMethod === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api';
  
	try {
	  const response = await this.helpers.requestWithAuthentication.call(this, credentialType, options);
  
	  if (typeof response === 'string') {
		try {
		  const parsedResponse = JSON.parse(response);
		  if (parsedResponse?.ocs?.meta?.status !== 'ok') {
			throw new NodeApiError(this.getNode(), parsedResponse);
		  }
		  return parsedResponse;
		} catch (error) {
		  if (response.includes('<b>Fatal error</b>')) {
			throw new NodeOperationError(
			  this.getNode(),
			  "Nextcloud responded with a 'Fatal error'. Check the server response for more details.",
			  {
				description: `Server response:\n${response}`,
			  },
			);
		  }
		  return response;
		}
	  } else {
		return response;
	  }
	} catch (error) {
	  throw new NodeApiError(this.getNode(), error);
	}
  }
  