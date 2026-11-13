import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to MSG91
 *
 */
export async function msg91ApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('msg91Api');

	if (query === undefined) {
		query = {};
	}

	query.authkey = credentials.authkey as string;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		form: body,
		qs: query,
		uri: requestUrl`https://api.msg91.com/api${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
