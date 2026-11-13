import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

import { getGoogleAccessToken } from '../GenericFunctions';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs?: IDataObject,
	uri?: RequestUrl,
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri ?? requestUrl`https://docs.googleapis.com/v1${endpoint}`,
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
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs?: IDataObject,
	uri?: RequestUrl,
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
