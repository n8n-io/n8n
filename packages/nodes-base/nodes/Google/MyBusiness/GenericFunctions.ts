import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	JsonObject,
	IExecuteSingleFunctions,
} from 'n8n-workflow';

import { NodeApiError } from 'n8n-workflow';

import type { LocalPost, CallToAction } from './Interfaces';

const addOptName = 'additionalOptions';

const getAllParams = (execFns: IExecuteSingleFunctions): Record<string, unknown> => {
	const params = execFns.getNode().parameters;
	const additionalOptions = execFns.getNodeParameter(addOptName, {}) as Record<string, unknown>;

	return { ...params, ...additionalOptions };
};

type ParamMappers<T> = {
	[K in keyof T]?: (value: T[K] | undefined, obj: T) => void;
};

function formatParams<T extends Record<string, any>>(obj: T, mappers?: ParamMappers<T>): T {
	if (mappers) {
		Object.entries(mappers).forEach(([key, mapFunc]) => {
			if (mapFunc && obj[key as keyof T] !== undefined) {
				mapFunc(obj[key as keyof T], obj);
				delete obj[key as keyof T]; // Remove the original key if needed
			}
		});
	}
	return obj;
}

export async function createPostPresend(
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const params = getAllParams(this) as LocalPost;

	// Define the mappers for actionType and url to populate callToAction
	const mappers: ParamMappers<LocalPost> = {
		callToAction: (value: CallToAction | undefined, obj: LocalPost) => {
			if (value && (!obj.callToAction || !obj.callToAction.actionType || !obj.callToAction.url)) {
				obj.callToAction = {
					actionType: value.actionType,
					url: value.url,
				};
			}
		},
		// ToDo: Map the rest of the fields
	};

	const body: LocalPost = formatParams(params, mappers);

	// Ensure that callToAction is only added if both actionType and url are present
	if (body.callToAction && (!body.callToAction.actionType || !body.callToAction.url)) {
		delete body.callToAction;
	}

	opts.body = body; // Assign the typed body to opts.body

	return opts;
}

/* The following functions are used for the loadOptions as there is no support for pagination for loadOptions in declarative style */
export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	url?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		url: url || `https://mybusiness.googleapis.com/v4${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.requestOAuth2.call(this, 'googleMyBusinessOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}
