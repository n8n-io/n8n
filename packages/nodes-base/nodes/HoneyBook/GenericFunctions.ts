import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type thisT = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

export async function withAuthentication(this: thisT, qs: IDataObject) {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
	const defaultCredentials = await this.getDefaultCredentials!('honeyBookApi');

	return {
		...qs,
		...defaultCredentials,
	};
}

export async function honeyBookApiRequest(
	this: thisT,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		let options: IHttpRequestOptions = {
			headers: {},
			method,
			qs: await withAuthentication.call(this, qs),
			body,
			url: uri || `http://localhost:3000/api/v2${resource}`,
			json: true,
		};
		options = Object.assign({}, options, option);
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.httpRequest(options);
	} catch (error) {
		console.log('=== HB API REQUEST ERROR ===', error);
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
