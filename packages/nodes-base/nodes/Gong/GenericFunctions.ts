import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import get from 'lodash/get';
import toPath from 'lodash/toPath';

export async function gongApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const authentication = this.getNodeParameter('authentication', 0) as 'accessToken' | 'oAuth2';
	const credentialsType = authentication === 'oAuth2' ? 'gongOAuth2Api' : 'gongApi';
	const { baseUrl } = await this.getCredentials<{
		baseUrl: string;
	}>(credentialsType);

	const options: IHttpRequestOptions = {
		method,
		url: baseUrl.replace(new RegExp('/$'), '') + endpoint,
		json: true,
		headers: {
			'Content-Type': 'application/json',
		},
		body,
		qs: query,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}

export async function gongApiPaginateRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	itemIndex: number = 0,
	rootProperty: string | undefined = undefined,
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0) as 'accessToken' | 'oAuth2';
	const credentialsType = authentication === 'oAuth2' ? 'gongOAuth2Api' : 'gongApi';
	const { baseUrl } = await this.getCredentials<{
		baseUrl: string;
	}>(credentialsType);

	const options: IHttpRequestOptions = {
		method,
		url: baseUrl.replace(new RegExp('/$'), '') + endpoint,
		json: true,
		headers: {
			'Content-Type': 'application/json',
		},
		body,
		qs: query,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	const pages = await this.helpers.requestWithAuthenticationPaginated.call(
		this,
		options,
		itemIndex,
		{
			requestInterval: 340, // Rate limit 3 calls per second
			continue: '={{ $response.body.records.cursor }}',
			request: {
				[method === 'POST' ? 'body' : 'qs']:
					'={{ $if($response.body?.records.cursor, { cursor: $response.body.records.cursor }, {}) }}',
				url: options.url,
			},
		},
		credentialsType,
	);

	if (rootProperty) {
		let results: IDataObject[] = [];
		for (const page of pages) {
			const items = page.body[rootProperty];
			if (items) {
				results = results.concat(items);
			}
		}
		return results;
	} else {
		return pages.flat();
	}
}

export const getCursorPaginator = (rootProperty: string) => {
	return async function cursorPagination(
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		let executions: INodeExecutionData[] = [];
		let responseData: INodeExecutionData[];
		let nextCursor: string | undefined = undefined;
		const returnAll = this.getNodeParameter('returnAll', true) as boolean;

		const extractItems = (page: INodeExecutionData) => {
			const paths = toPath(rootProperty);
			let items: IDataObject[] = [page.json];
			for (const path of paths) {
				items = items.flatMap((x) => get(x, path)) as IDataObject[];
			}
			if (items.length > 0) {
				executions = executions.concat(items.map((item) => ({ json: item })));
			}
		};

		do {
			(requestOptions.options.body as IDataObject).cursor = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);
			const lastItem = responseData[responseData.length - 1].json;
			nextCursor = (lastItem.records as IDataObject)?.cursor as string | undefined;
			responseData.forEach(extractItems);
		} while (returnAll && nextCursor);

		return executions;
	};
};

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}
