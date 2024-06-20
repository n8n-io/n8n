import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function uptimeRobotApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('uptimeRobotApi');

	let options: IRequestOptions = {
		method,
		qs,
		form: {
			api_key: credentials.apiKey,
			...body,
		},
		uri: uri || `https://api.uptimerobot.com/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		const responseData = await this.helpers.request(options);
		if (responseData.stat !== 'ok') {
			throw new NodeOperationError(this.getNode(), responseData as Error);
		}
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
