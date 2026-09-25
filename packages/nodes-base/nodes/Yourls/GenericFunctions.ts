import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function yourlsApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('yourlsApi');

	qs.signature = credentials.signature as string;
	qs.format = 'json';

	const options: IRequestOptions = {
		method,
		qs,
		uri: `${credentials.url}/yourls-api.php`,
		json: true,
	};

	// Every call this node makes is a GET with all of its data in the query string. Sending an
	// (empty) JSON body on a GET request is unusual enough that some reverse proxies/WAFs in front
	// of a self-hosted YOURLS instance reject it outright, even though YOURLS itself ignores it.
	if (Object.keys(body).length) {
		options.body = body;
	}
	try {
		const response = await this.helpers.request.call(this, options);

		if (response.status === 'fail') {
			throw new NodeOperationError(
				this.getNode(),
				`Yourls error response [400]: ${response.message}`,
			);
		}

		if (typeof response === 'string' && response.includes('<b>Fatal error</b>')) {
			throw new NodeOperationError(
				this.getNode(),
				"Yourls responded with a 'Fatal error', check description for more details",
				{
					description: `Server response:\n${response}`,
				},
			);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
