import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export async function gongApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		method,
		url: `https://api.gong.io${endpoint}`,
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

	return await this.helpers.requestWithAuthentication.call(this, 'gongApi', options);
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
	const options: IHttpRequestOptions = {
		method,
		url: `https://api.gong.io${endpoint}`,
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
				[method === 'POST' ? 'body' : 'qs']: {
					cursor: '={{ $response.body?.records.cursor ?? "" }}',
				},
				url: options.url,
			},
		},
		'gongApi',
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
			const items = page.json[rootProperty] as IDataObject[];
			if (items) {
				executions = executions.concat(items.map((item) => ({ json: item })));
			}
		};

		do {
			(requestOptions.options.body as IDataObject).cursor = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);
			const lastItem = responseData[responseData.length - 1].json;
			nextCursor = (lastItem.records as IDataObject).cursor as string | undefined;
			responseData.forEach(extractItems);
		} while (returnAll && nextCursor);

		return executions;
	};
};
