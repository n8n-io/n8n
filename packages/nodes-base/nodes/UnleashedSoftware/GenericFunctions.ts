import { createHmac } from 'crypto';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import qs from 'qs';

export async function unleashedApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject = {},
	query: IDataObject = {},
	pageNumber?: number,
	headers?: object,
) {
	const paginatedPath = pageNumber ? `/${path}/${pageNumber}` : `/${path}`;

	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs: query,
		body,
		url: `https://api.unleashedsoftware.com/${paginatedPath}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	const credentials = await this.getCredentials('unleashedSoftwareApi');

	const signature = createHmac('sha256', credentials.apiKey as string)
		.update(qs.stringify(query))
		.digest('base64');

	options.headers = Object.assign({}, headers, {
		'api-auth-id': credentials.apiId,
		'api-auth-signature': signature,
	});

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function unleashedApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	let responseData;
	let pageNumber = 1;

	query.pageSize = 1000;

	do {
		responseData = await unleashedApiRequest.call(this, method, endpoint, body, query, pageNumber);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		pageNumber++;
	} while (
		(responseData.Pagination.PageNumber as number) <
		(responseData.Pagination.NumberOfPages as number)
	);
	return returnData;
}

//.NET code is serializing dates in the following format: "/Date(1586833770780)/"
//which is useless on JS side and could not treated as a date for other nodes
//so we need to convert all of the fields that has it.

export function convertNETDates(item: { [key: string]: any }) {
	Object.keys(item).forEach((path) => {
		const type = typeof item[path] as string;
		if (type === 'string') {
			const value = item[path] as string;
			const a = /\/Date\((\d*)\)\//.exec(value);
			if (a) {
				item[path] = new Date(+a[1]);
			}
		}
		if (type === 'object' && item[path]) {
			convertNETDates(item[path] as IDataObject);
		}
	});
}
