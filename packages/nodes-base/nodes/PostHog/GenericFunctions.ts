import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function posthogApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('postHogApi');

	body.api_key = credentials.apiKey as string;

	const options: WithRequestTarget<IRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: requestUrl`${credentials.url}${path}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export interface IEvent {
	event: string;
	properties: { [key: string]: any };
}

export interface IAlias {
	type: string;
	event: string;
	properties: { [key: string]: any };
	context: { [key: string]: any };
}

export interface ITrack {
	type: string;
	event: string;
	name: string;
	messageId?: string;
	distinct_id: string;
	category?: string;
	properties: { [key: string]: any };
	context: { [key: string]: any };
}

export interface IIdentity {
	event: string;
	messageId?: string;
	distinct_id: string;
	properties: { [key: string]: any };
}
