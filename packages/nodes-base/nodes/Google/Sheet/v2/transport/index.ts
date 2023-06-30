import type { OptionsWithUri } from 'request';
import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../../../GenericFunctions';

export async function apiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
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
	const options: OptionsWithUri = {
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

		if (error.message.includes('PERMISSION_DENIED')) {
			const message = `Missing permissions for Google Sheet, ${error.message}}`;
			const details = error.description ? ` Details of the error: ${error.description}.` : '';
			const description = `Please check that the account you're using has the right permissions. (If you're trying to modify the sheet, you'll need edit access.)${details}`;
			throw new NodeApiError(this.getNode(), error as JsonObject, { message, description });
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
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
