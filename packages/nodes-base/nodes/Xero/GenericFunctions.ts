import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { decodePathValue, NodeApiError, requestUrl } from 'n8n-workflow';

export async function xeroApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	{ organizationId, ...body }: any = {},
	qs: IDataObject = {},
	uri?: RequestUrl,
	headers: IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
			...(organizationId && { 'Xero-tenant-id': organizationId }),
		},
		method,
		body,
		qs,
		uri: uri ?? requestUrl`https://api.xero.com/api.xro/2.0${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(this, 'xeroOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function xeroApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let page = 1;

	do {
		responseData = await xeroApiRequest.call(this, method, endpoint, body, { ...query, page });
		page++;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData[propertyName].length !== 0);

	return returnData;
}

export const toPathValue = (version: number, value: string) =>
	version < 1.1 ? decodePathValue(value) : value;
