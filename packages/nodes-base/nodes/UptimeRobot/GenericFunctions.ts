import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestUrl } from 'n8n-workflow';

export async function uptimeRobotApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('uptimeRobotApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		qs,
		form: {
			api_key: credentials.apiKey,
			...body,
		},
		uri: requestUrl`https://api.uptimerobot.com/v2${resource}`,
		json: true,
	};
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
