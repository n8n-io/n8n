import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../../../GenericFunctions';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://bigquery.googleapis.com/bigquery${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			const { access_token } = await getGoogleAccessToken.call(this, credentials, 'bigquery');

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleBigQueryOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: error?.error?.error?.message || error.message,
		});
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 10000;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);

		query.pageToken = responseData.pageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.pageToken !== undefined && responseData.pageToken !== '');

	return returnData;
}
