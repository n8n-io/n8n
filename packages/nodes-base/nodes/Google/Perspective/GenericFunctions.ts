import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions,
	method: 'POST',
	endpoint: RequestPath,
	body: IDataObject = {},
) {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		uri: requestUrl`https://commentanalyzer.googleapis.com${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await this.helpers.requestOAuth2.call(this, 'googlePerspectiveOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
