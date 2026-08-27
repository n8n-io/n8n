import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';

export async function rocketchatApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	method: IHttpRequestMethods,
	operation: string,

	body: any = {},
	queryParams?: IDataObject,
	headers?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('rocketchatApi');

	const options: IRequestOptions = {
		headers,
		method,
		body,
		uri: `${credentials.domain}/api/v1${resource}.${operation}`,
		qs: queryParams,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return await this.helpers.requestWithAuthentication.call(this, 'rocketchatApi', options);
}

export async function rocketchatApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	resource: string,
	method: IHttpRequestMethods,
	operation: string,
	body: IDataObject = {},
	queryParams: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData: IDataObject;
	let offset = 0;
	const { limit: _limit, ...paginationQuery } = queryParams;
	const count = paginationQuery.count ?? 100;

	do {
		responseData = (await rocketchatApiRequest.call(this, resource, method, operation, body, {
			...paginationQuery,
			offset,
			count,
		})) as IDataObject;

		const responseItems = responseData[propertyName] as IDataObject[] | undefined;

		if (!Array.isArray(responseItems) || responseItems.length === 0) {
			break;
		}

		returnData.push.apply(returnData, responseItems);
		offset = returnData.length;
	} while (
		returnData.length < ((responseData.total as number | undefined) ?? Number.POSITIVE_INFINITY)
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}
