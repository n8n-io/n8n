import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to SIGNL4
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 *
 */

export async function SIGNL4ApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	body: string,
	query: IDataObject = {},
	option: Pick<IRequestOptions, 'formData'> & { uri?: never; url?: never; baseURL?: never } = {},
): Promise<any> {
	const credentials = await this.getCredentials('signl4Api');

	const teamSecret = credentials?.teamSecret as string;

	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: '*/*',
		},
		method,
		body,
		qs: query,
		uri: requestUrl`https://connect.signl4.com/webhook/${teamSecret}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
