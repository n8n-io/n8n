import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function newRelicApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
): Promise<unknown> {
	const credentials = await this.getCredentials('newRelicApi');
	const region = credentials.region as string;

	const baseUrl =
		region === 'eu' ? 'https://log-api.eu.newrelic.com' : 'https://log-api.newrelic.com';

	const options: IRequestOptions = {
		method,
		body,
		qs,
		uri: `${baseUrl}/log/v1`,
		json: true,
		headers: {
			'Api-Key': credentials.licenseKey,
			'Content-Type': 'application/json',
		},
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
