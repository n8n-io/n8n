import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getGoogleAccessToken } from '../../../GenericFunctions';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://sheets.googleapis.com${resource}`,
		json: true,
		...option,
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

			const { access_token } = await getGoogleAccessToken.call(this, credentials, 'sheetV2');

			options.headers!.Authorization = `Bearer ${access_token}`;

			return await this.helpers.request(options);
		} else if (authenticationMethod === 'triggerOAuth2') {
			return await this.helpers.requestOAuth2.call(this, 'googleSheetsTriggerOAuth2Api', options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleSheetsOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		if (error instanceof NodeApiError) {
			if (error.message.includes('PERMISSION_DENIED')) {
				const details = error.description ? ` Details of the error: ${error.description}.` : '';
				const description = `Please check that the account you're using has the right permissions. (If you're trying to modify the sheet, you'll need edit access.)${details}`;

				set(error, 'description', description);
			}

			throw error;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	const url = uri ? uri : `https://sheets.googleapis.com${method}`;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query, url);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
