import {
	OptionsWithUrl,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, projectId: string, method: string, resource: string, body: any = {}, qs: IDataObject = {}, headers: IDataObject = {}, uri: string | null = null): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUrl = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: uri || `https://${projectId}.firebaseio.com/${resource}.json`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2!.call(this, 'googleFirebaseRealtimeDatabaseOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors;

			if (error.response.body.error.errors) {

				errors = error.response.body.error.errors;

				errors = errors.map((e: IDataObject) => e.message).join('|');

			} else {
				errors = error.response.body.error.message;
			}

			// Try to return the error prettier
			throw new Error(
				`Google Firebase error response [${error.statusCode}]: ${errors}`,
			);
		}
		throw error;
	}
}


export async function googleApiRequestAllItems(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, projectId: string, method: string, resource: string, body: any = {}, qs: IDataObject = {}, headers: IDataObject = {}, uri: string | null = null): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	qs.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, projectId, method, resource, body, qs, {}, uri);
		qs.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[resource]);
	} while (
		responseData['nextPageToken'] !== undefined &&
		responseData['nextPageToken'] !== ''
	);

	return returnData;
}
