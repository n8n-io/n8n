import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,
	endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://analyticsreporting.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);

	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errorMessages;

			if (error.response.body.error.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.error.errors;

				errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

				errorMessages = errorMessages.join('|');

			} else if (error.response.body.error.message) {
				errorMessages = error.response.body.error.message;
			}

			throw new Error(`Google Analytics error response [${error.statusCode}]: ${errorMessages}`);
		}
		throw error;
	}
}

export async function googleApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	body.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		if (body.reportRequests && Array.isArray(body.reportRequests)) {
			body.reportRequests[0].pageToken = responseData['nextPageToken'];
		} else {
			body.pageToken = responseData['nextPageToken'];
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		(responseData['nextPageToken'] !== undefined &&
			responseData['nextPageToken'] !== '') ||
		(responseData['reports'] &&
			responseData['reports'][0].nextPageToken &&
			responseData['reports'][0].nextPageToken !== undefined)
	);

	return returnData;
}

export function simplify(responseData: any) { // tslint:disable-line:no-any
	const { columnHeader: { dimensions }, data: { rows } } = responseData[0];
	responseData = [];
	for (const row of rows) {
		const data: IDataObject = {};
		if (dimensions) {
			for (let i = 0; i < dimensions.length; i++) {
				data[dimensions[i]] = row.dimensions[i];
				data['total'] = row.metrics[0].values.join(',');
			}
		} else {
			data['total'] = row.metrics[0].values.join(',');
		}
		responseData.push(data);
	}
	return responseData;
}
