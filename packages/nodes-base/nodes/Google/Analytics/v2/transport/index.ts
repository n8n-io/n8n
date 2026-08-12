import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const propertyType = this.getNodeParameter('propertyType', 0, 'universal') as string;
	const baseURL =
		propertyType === 'ga4'
			? 'https://analyticsdata.googleapis.com'
			: 'https://analyticsreporting.googleapis.com';

	let options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri ?? `${baseURL}${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
	} catch (error) {
		const errorData = (error.message || '').split(' - ')[1] as string;
		if (errorData) {
			const parsedError = JSON.parse(errorData.trim());
			if (parsedError.error?.message) {
				const [message, ...rest] = parsedError.error.message.split('\n');
				const description = rest.join('\n');
				const httpCode = parsedError.error.code;
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message,
					description,
					httpCode,
				});
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject, { message: error.message });
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const propertyType = this.getNodeParameter('propertyType', 0, 'universal') as string;
	const returnData: IDataObject[] = [];

	let responseData;

	if (propertyType === 'ga4') {
		let rows: IDataObject[] = [];
		query.limit = 100000;
		query.offset = 0;

		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		rows = rows.concat(responseData.rows as IDataObject[]);
		query.offset = rows.length;

		while (responseData.rowCount > rows.length) {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			rows = rows.concat(responseData.rows as IDataObject[]);
			query.offset = rows.length;
		}
		responseData.rows = rows;
		returnData.push(responseData as IDataObject);
	} else {
		do {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			if (body.reportRequests && Array.isArray(body.reportRequests)) {
				(body.reportRequests as IDataObject[])[0].pageToken =
					responseData[propertyName][0].nextPageToken;
			} else {
				body.pageToken = responseData.nextPageToken;
			}
			returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		} while (
			(responseData.nextPageToken !== undefined && responseData.nextPageToken !== '') ||
			responseData[propertyName]?.[0].nextPageToken !== undefined
		);
	}

	return returnData;
}
