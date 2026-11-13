import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function twistApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: Pick<IRequestOptions, 'formData'> = {},
) {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		qs,
		uri: requestUrl`https://api.twist.com/api/v3${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	Object.assign(options, option);

	try {
		return await this.helpers.requestOAuth2.call(this, 'twistOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
