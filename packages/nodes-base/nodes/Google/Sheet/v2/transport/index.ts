import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

import type { GoogleServiceAccount } from '../../../GenericFunctions';
import { getGoogleAccessToken } from '../../../GenericFunctions';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: RequestUrl,
	headers: IDataObject = {},
	option: Pick<IRequestOptions, 'resolveWithFullResponse' | 'encoding' | 'json'> & {
		uri?: never;
		url?: never;
		baseURL?: never;
	} = {},
	service: GoogleServiceAccount = 'sheetV2',
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;
	const baseOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		json: true,
		...option,
	};
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		...baseOptions,
		uri: uri ?? requestUrl`https://sheets.googleapis.com${resource}`,
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

			const { access_token } = await getGoogleAccessToken.call(this, credentials, service);

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
	endpoint: RequestPath,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: RequestUrl,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query, uri);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
