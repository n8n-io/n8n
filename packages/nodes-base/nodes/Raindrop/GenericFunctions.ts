import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an authenticated API request to Raindrop.
 */
export async function raindropApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
) {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		uri: `https://api.raindrop.io/rest/v1${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.requestOAuth2.call(this, 'raindropOAuth2Api', options, {
			includeCredentialsOnRefreshOnBody: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an authenticated API request to Raindrop and return all items across pages.
 */
export async function raindropApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	limit?: number,
): Promise<IDataObject[]> {
	if (limit !== undefined && limit <= 0) {
		return [];
	}

	const returnData: IDataObject[] = [];

	let responseData;
	let items: IDataObject[] = [];
	let page = 0;
	const perpage = limit !== undefined && limit < 50 ? limit : 50;

	do {
		const qs: IDataObject = {
			...query,
			page,
			perpage,
		};
		responseData = await raindropApiRequest.call(this, method, endpoint, qs, body);
		items = Array.isArray(responseData?.[propertyName])
			? (responseData[propertyName] as IDataObject[])
			: [];
		returnData.push(...items);

		if (limit !== undefined && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		if (items.length < perpage) {
			break;
		}

		if (responseData?.count !== undefined && returnData.length >= (responseData.count as number)) {
			break;
		}

		page++;
	} while (items.length >= perpage);

	return returnData;
}
