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

/** Raindrop caps a page of raindrops at 50 items. */
const RAINDROPS_PER_PAGE = 50;

/**
 * Page through a paginated Raindrop collection. `limit` stops the paging early;
 * omit it to read every page.
 */
export async function raindropApiRequestAllItems(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	limit?: number,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	const perpage = limit === undefined ? RAINDROPS_PER_PAGE : Math.min(limit, RAINDROPS_PER_PAGE);
	let page = 0;
	let pageLength = 0;

	do {
		const responseData = await raindropApiRequest.call(
			this,
			method,
			endpoint,
			{
				...qs,
				perpage,
				page,
			},
			body,
		);

		const items = (responseData.items ?? []) as IDataObject[];
		pageLength = items.length;
		returnData.push(...items);
		page++;
	} while (pageLength === perpage && (limit === undefined || returnData.length < limit));

	return limit === undefined ? returnData : returnData.slice(0, limit);
}
