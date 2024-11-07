import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function gotifyApiRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string | undefined,
	_option = {},
): Promise<any> {
	const credentials = await context.getCredentials('gotifyApi');

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
		return await context.helpers.httpRequestWithAuthentication.call(context, 'gotifyApi', options);
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject);
	}
}

export async function gotifyApiRequestAllItems(
	context: IExecuteFunctions,
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
		responseData = await gotifyApiRequest(context, method, endpoint, body, query, uri);
		if (responseData.paging.next) {
			uri = responseData.paging.next;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.paging.next);

	return returnData;
}
