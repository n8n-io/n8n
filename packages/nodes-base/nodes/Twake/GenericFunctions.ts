import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

/**
 * Make an API request to Twake
 *
 */
export async function twakeApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: object,
	query?: IDataObject,
) {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {},
		method,
		body,
		qs: query,
		uri: requestUrl`https://plugins.twake.app/plugins/n8n${resource}`,
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
