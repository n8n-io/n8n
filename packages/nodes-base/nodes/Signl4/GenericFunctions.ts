import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('signl4Api');

	const teamSecret = credentials?.teamSecret as string;

	let options: IRequestOptions = {
		headers: {
			Accept: '*/*',
		},
		method,
		body,
		qs: query,
		uri: `https://connect.signl4.com/webhook/${teamSecret}`,
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
