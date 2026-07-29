import { snakeCase } from 'change-case';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IOAuth2Options,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

export async function shopifyApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;

	let credentials;
	let credentialType = 'shopifyOAuth2Api';

	if (authenticationMethod === 'apiKey') {
		credentials = await this.getCredentials('shopifyApi');
		credentialType = 'shopifyApi';
	} else if (authenticationMethod === 'accessToken') {
		credentials = await this.getCredentials('shopifyAccessTokenApi');
		credentialType = 'shopifyAccessTokenApi';
	} else {
		credentials = await this.getCredentials('shopifyOAuth2Api');
	}

	const options: IRequestOptions = {
		method,
		qs: query,
		uri: uri || `https://${credentials.shopSubdomain}.myshopify.com/admin/api/2024-07/${resource}`,
		body,
		json: true,
	};

	const oAuth2Options: IOAuth2Options = {
		tokenType: 'Bearer',
		keyToIncludeInAccessTokenHeader: 'X-Shopify-Access-Token',
	};

	if (authenticationMethod === 'apiKey') {
		Object.assign(options, {
			auth: { username: credentials.apiKey, password: credentials.password },
		});
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	// Only limit and fields are allowed for page_info links
	// https://shopify.dev/docs/api/usage/pagination-rest#limitations-and-considerations
	if (uri?.includes('page_info')) {
		options.qs = {};

		if (query.limit) {
			options.qs.limit = query.limit;
		}

		if (query.fields) {
			options.qs.fields = query.fields;
		}
	}

	return await this.helpers.requestWithAuthentication.call(this, credentialType, options, {
		oauth2: oAuth2Options,
	});
}

export async function shopifyApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	/*
	 	When paginating some parameters
		(e.g. product:getAll -> title ) cannot
		be empty in the query string, so remove
		all the empty ones before paginating.
	*/
	for (const field in query) {
		if (query[field] === '') {
			delete query[field];
		}
	}

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await shopifyApiRequest.call(this, method, resource, body, query, uri, {
			resolveWithFullResponse: true,
		});
		if (responseData.headers.link) {
			uri = responseData.headers.link.split(';')[0].replace('<', '').replace('>', '');
		}
		returnData.push.apply(returnData, responseData.body[propertyName] as IDataObject[]);
	} while (responseData.headers.link?.includes('rel="next"'));
	return returnData;
}

export function keysToSnakeCase(elements: IDataObject[] | IDataObject): IDataObject[] {
	if (elements === undefined) {
		return [];
	}
	if (!Array.isArray(elements)) {
		elements = [elements];
	}
	for (const element of elements) {
		for (const key of Object.keys(element)) {
			if (key !== snakeCase(key)) {
				element[snakeCase(key)] = element[key];
				delete element[key];
			}
		}
	}
	return elements;
}
