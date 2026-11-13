import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function lineApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	_resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri: RequestUrl,
	option: Pick<IRequestOptions, 'formData'> = {},
): Promise<any> {
	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri,
		json: true,
	};
	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(this, 'lineNotifyOAuth2Api', options, {
			tokenType: 'Bearer',
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
