import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function gotifyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string | undefined,
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('gotifyApi');

	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url: uri ?? `${credentials.url}${path}`,
		json: true,
		skipSslCertificateValidation: credentials.ignoreSSLIssues as boolean,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.httpRequestWithAuthentication.call(this, 'gotifyApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function gotifyApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.limit = 100;
	do {
		responseData = await gotifyApiRequest.call(this, method, endpoint, body, query, uri);
		if (responseData.paging.next) {
			uri = responseData.paging.next;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.paging.next);

	return returnData;
}
