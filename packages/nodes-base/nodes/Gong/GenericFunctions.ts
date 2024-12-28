import get from 'lodash/get';
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

const getCursorPaginator = (
	extractItems: (items: INodeExecutionData[]) => INodeExecutionData[],
) => {
	return async function cursorPagination(
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		let executions: INodeExecutionData[] = [];
		let responseData: INodeExecutionData[];
		let nextCursor: string | undefined = undefined;
		const returnAll = this.getNodeParameter('returnAll', true) as boolean;

		do {
			(requestOptions.options.body as IDataObject).cursor = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);
			const lastItem = responseData[responseData.length - 1].json;
			nextCursor = (lastItem.records as IDataObject)?.cursor as string | undefined;
			executions = executions.concat(extractItems(responseData));
		} while (returnAll && nextCursor);

		return executions;
	};
};

export const extractCalls = (items: INodeExecutionData[]): INodeExecutionData[] => {
	const calls: IDataObject[] = items.flatMap((item) => get(item.json, 'calls') as IDataObject[]);
	return calls.map((call) => {
		const { metaData, ...rest } = call ?? {};
		return { json: { ...(metaData as IDataObject), ...rest } };
	});
};

export const extractUsers = (items: INodeExecutionData[]): INodeExecutionData[] => {
	const users: IDataObject[] = items.flatMap((item) => get(item.json, 'users') as IDataObject[]);
	return users.map((user) => ({ json: user }));
};

export const getCursorPaginatorCalls = () => {
	return getCursorPaginator(extractCalls);
};

export const getCursorPaginatorUsers = () => {
	return getCursorPaginator(extractUsers);
};

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const { resource, operation } = this.getNode().parameters;

		if (resource === 'call') {
			if (operation === 'get') {
				if (response.statusCode === 404) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required call doesn't match any existing one",
						description: "Double-check the value in the parameter 'Call to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
				if (response.statusCode === 404) {
					const primaryUserId = this.getNodeParameter('filters.primaryUserIds', {}) as IDataObject;
					if (Object.keys(primaryUserId).length !== 0) {
						return [{ json: {} }];
					}
				} else if (response.statusCode === 400 || response.statusCode === 500) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						description: 'Double-check the value(s) in the parameter(s)',
					});
				}
			}
		} else if (resource === 'user') {
			if (operation === 'get') {
				if (response.statusCode === 404) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
				if (response.statusCode === 404) {
					const userIds = this.getNodeParameter('filters.userIds', '') as string;
					if (userIds) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The Users IDs don't match any existing user",
							description: "Double-check the values in the parameter 'Users IDs' and try again",
						});
					}
				}
			}
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}

export function isValidNumberIds(value: number | number[] | string | string[]): boolean {
	if (typeof value === 'number') {
		return true;
	}

	if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
		return true;
	}

	if (typeof value === 'string') {
		const parts = value.split(',');
		return parts.every((part) => !isNaN(Number(part.trim())));
	}

	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
		return true;
	}

	return false;
}
