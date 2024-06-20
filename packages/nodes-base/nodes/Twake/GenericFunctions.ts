import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';

/**
 * Make an API request to Twake
 *
 */
export async function twakeApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: object,
	query?: IDataObject,
	uri?: string,
) {
	const options: IRequestOptions = {
		headers: {},
		method,
		body,
		qs: query,
		uri: uri || `https://plugins.twake.app/plugins/n8n${resource}`,
		json: true,
	};

	// if (authenticationMethod === 'cloud') {
	// } else {
	// 	const credentials = await this.getCredentials('twakeServerApi');
	// 	options.auth = { user: credentials!.publicId as string, pass: credentials!.privateApiKey as string };
	// 	options.uri = `${credentials!.hostUrl}/api/v1${resource}`;
	// }

	return await this.helpers.requestWithAuthentication.call(this, 'twakeCloudApi', options);
}
