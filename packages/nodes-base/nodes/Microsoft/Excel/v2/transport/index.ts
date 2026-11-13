import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { decodePathValue, NodeApiError, NodeOperationError, requestUrl } from 'n8n-workflow';

export function toWorkbookId(this: IExecuteFunctions | ILoadOptionsFunctions, id: string): string {
	return this.getNode().typeVersion < 2.3 ? decodePathValue(id) : id.replaceAll('%21', '!');
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const baseUrl = 'https://graph.microsoft.com';

	if (uri && (!URL.canParse(uri) || new URL(uri).origin !== new URL(baseUrl).origin)) {
		throw new NodeOperationError(
			this.getNode(),
			'Refusing to send credentials to an unexpected host',
		);
	}

	const options: LegacyRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		...(uri ? { uri } : { uri: requestUrl`${baseUrl}/v1.0/me/drive${resource}` }),
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		return await this.helpers.requestOAuth2.call(this, 'microsoftExcelOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}
