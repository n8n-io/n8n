import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getGoogleAccessToken } from '../GenericFunctions';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			const { access_token } = await getGoogleAccessToken.call(this, credentials, 'drive');

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleDriveOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = query.maxResults || 100;
	query.pageSize = query.pageSize || 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

export function extractId(url: string): string {
	if (url.includes('/d/')) {
		//https://docs.google.com/document/d/1TUJGUf5HUv9e6MJBzcOsPruxXDeGMnGYTBWfkMagcg4/edit
		const data = url.match(/[-\w]{25,}/);
		if (Array.isArray(data)) {
			return data[0];
		}
	} else if (url.includes('/folders/')) {
		//https://drive.google.com/drive/u/0/folders/19MqnruIXju5sAWYD3J71im1d2CBJkZzy
		return url.split('/folders/')[1];
	}
	return url;
}
