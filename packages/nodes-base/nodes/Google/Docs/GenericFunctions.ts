import { isRecord } from '@n8n/utils/is-record';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getGoogleAccessToken } from '../GenericFunctions';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	uri?: string,
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
		uri: uri || `https://docs.googleapis.com/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	try {
		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			const { access_token } = await getGoogleAccessToken.call(this, credentials, 'docs');

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'googleDocsOAuth2Api', options);
		}
	} catch (error) {
		const apiError = new NodeApiError(this.getNode(), error as JsonObject);
		const response = isRecord(error) && isRecord(error.response) ? error.response : undefined;
		const headers = isRecord(response?.headers) ? response.headers : undefined;
		const contentType = headers?.['content-type'];
		const hasHtmlContentType =
			typeof contentType === 'string' && contentType.toLowerCase().includes('text/html');
		const hasHtmlMessage = [apiError.message, apiError.description].some(
			(value) => typeof value === 'string' && /<!doctype\s+html(?:\s|>)|<html(?:\s|>)/i.test(value),
		);

		if (hasHtmlContentType || hasHtmlMessage) {
			if (apiError.httpCode && apiError.httpCode !== '400') {
				apiError.description = undefined;
				apiError.cause = undefined;
				throw apiError;
			}

			throw new NodeApiError(
				this.getNode(),
				{},
				{
					httpCode: apiError.httpCode ?? undefined,
					message: `Google Docs could not process the request${apiError.httpCode ? ` (HTTP ${apiError.httpCode})` : ''}`,
					description:
						'The Google Docs node only supports native Google Docs. If this is an Office document, open it with Google Docs. Select "File > Save as Google Docs". Use the new Google Docs URL. Otherwise, check the document URL and access permissions.',
				},
			);
		}

		throw apiError;
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	uri?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	const query: IDataObject = { ...qs };
	query.maxResults = 100;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

export const hasKeys = (obj = {}) => Object.keys(obj).length > 0;
export const extractID = (url: string) => {
	try {
		const { hostname, pathname, searchParams } = new URL(url);
		if (hostname === 'docs.google.com') {
			return /^\/document\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(pathname)?.[1];
		}
		if (hostname === 'drive.google.com') {
			if (pathname === '/open') {
				const id = searchParams.get('id');
				return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : undefined;
			}
			return /^\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(pathname)?.[1];
		}
	} catch {
		// Bare IDs are not URLs. The caller uses them without extraction.
	}
	return undefined;
};
export const upperFirst = (str: string) => {
	return str[0].toUpperCase() + str.substr(1);
};
