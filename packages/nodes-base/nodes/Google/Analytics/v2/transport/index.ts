import { OptionsWithUri } from 'request';
import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const accessDataFor = this.getNodeParameter('accessDataFor', 0, 'universal') as string;
	const baseURL =
		accessDataFor === 'ga4'
			? 'https://analyticsdata.googleapis.com'
			: 'https://analyticsreporting.googleapis.com';

	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseURL}${endpoint}`,
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
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
	} catch (error) {
		const errorData = (error.message || '').split(' - ')[1] as string;
		if (errorData) {
			const parsedError = JSON.parse(errorData.trim());
			const [message, ...rest] = parsedError.error.message.split('\n');
			const description = rest.join('\n');
			const httpCode = parsedError.error.code;
			throw new NodeApiError(this.getNode(), error, { message, description, httpCode });
		}
		throw new NodeApiError(this.getNode(), error, { message: error.message });
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const accessDataFor = this.getNodeParameter('accessDataFor', 0, 'universal') as string;
	const returnData: IDataObject[] = [];

	let responseData;

	if (accessDataFor === 'ga4') {
		let rows: IDataObject[] = [];
		query.limit = 100000;
		query.offset = 0;

		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		rows = rows.concat(responseData.rows);
		query.offset = rows.length;

		while (responseData.rowCount > rows.length) {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			rows = rows.concat(responseData.rows);
			query.offset = rows.length;
		}
		responseData.rows = rows;
		returnData.push(responseData);
	} else {
		do {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			if (body.reportRequests && Array.isArray(body.reportRequests)) {
				(body.reportRequests as IDataObject[])[0]['pageToken'] =
					responseData[propertyName][0].nextPageToken;
			} else {
				body.pageToken = responseData['nextPageToken'];
			}
			returnData.push.apply(returnData, responseData[propertyName]);
		} while (
			(responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '') ||
			(responseData[propertyName] &&
				responseData[propertyName][0].nextPageToken &&
				responseData[propertyName][0].nextPageToken !== undefined)
		);
	}

	return returnData;
}
