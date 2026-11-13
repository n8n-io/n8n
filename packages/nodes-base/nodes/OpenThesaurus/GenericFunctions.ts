import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function openThesaurusApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	try {
		const options = {
			headers: {
				'User-Agent': 'https://n8n.io',
			},
			method,
			qs,
			body,
			uri: requestUrl`https://www.openthesaurus.de${resource}`,
			json: true,
		} satisfies WithRequestTarget<IRequestOptions, 'uri'>;

		options.qs.format = 'application/json';

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
