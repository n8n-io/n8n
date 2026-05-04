/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

export async function gravityZoneApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	apiEndpoint: string,
	method: string,
	params: IDataObject = {},
	apiVersion = 'v1.0',
): Promise<IDataObject> {
	const credentials = await this.getCredentials('gravityZoneApi');

	const baseUrl = (credentials.apiUrl as string).replace(/\/$/, '');

	const rpcBody = {
		id: uuid(),
		jsonrpc: '2.0',
		method,
		params,
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${baseUrl}/${apiVersion}/jsonrpc/${apiEndpoint}`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		headers: { 'Content-Type': 'application/json' },
		body: rpcBody,
		json: true,
		timeout: 300_000, // 5 minutes
	};

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'gravityZoneApi',
		options,
	);

	const parsed = typeof response === 'string' ? jsonParse(response) : response;

	if (parsed.error) {
		throw new NodeApiError(this.getNode(), parsed as JsonObject, {
			message: parsed.error.message ?? 'An unknown GravityZone API error occurred!',
			description: parsed.error.data?.details ?? JSON.stringify(parsed.error),
		});
	}

	return (parsed.result as IDataObject) ?? {};
}
