import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function xeroApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://api.xero.com/api.xro/2.0${resource}`,
		json: true,
	};
	try {
		if (body.organizationId) {
			options.headers = { ...options.headers, 'Xero-tenant-id': body.organizationId };
			delete body.organizationId;
		}
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
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await xeroApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData[propertyName].length !== 0);

	return returnData;
}
