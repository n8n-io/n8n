import type {
	JsonObject,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IRequestOptions,
	INodeExecutionData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function microsoftApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: url ?? `https://graph.microsoft.com/v1.0${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	return await this.helpers.requestWithAuthentication.call(
		this,
		'microsoftEntraOAuth2Api',
		options,
	);
}

export async function microsoftApiPaginateRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs?: IDataObject,
	headers?: IDataObject,
	url?: string,
	itemIndex: number = 0,
): Promise<IDataObject[]> {
	// Todo: IHttpRequestOptions doesn't have uri property which is required for requestWithAuthenticationPaginated
	const options: IRequestOptions = {
		method,
		uri: url ?? `https://graph.microsoft.com/v1.0${endpoint}`,
		json: true,
		headers,
		body,
		qs,
	};

	const pages = await this.helpers.requestWithAuthenticationPaginated.call(
		this,
		options,
		itemIndex,
		{
			continue: '={{ !!$response.body?.["@odata.nextLink"] }}',
			request: {
				url: '={{ $response.body?.["@odata.nextLink"] ?? $request.url }}',
			},
		},
		'microsoftEntraOAuth2Api',
	);

	let results: IDataObject[] = [];
	for (const page of pages) {
		const items = page.body.value as IDataObject[];
		if (items) {
			results = results.concat(items);
		}
	}

	return results;
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const { resource, operation } = this.getNode().parameters as {
			resource: string;
			operation: string;
		};
		const {
			code: errorCode,
			message: errorMessage,
			details: errorDetails,
		} = (response.body as IDataObject)?.error as {
			code: string;
			message: string;
			innerError?: {
				code: string;
				'request-id'?: string;
				date?: string;
			};
			details?: Array<{
				code: string;
				message: string;
			}>;
		};

		if (errorCode === 'Request_BadRequest' && errorMessage === 'Invalid object identifier') {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';

			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${parameterResource} ID is invalid`,
				description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
			});
		}
		if (errorCode === 'Request_ResourceNotFound') {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';
			let parameterDisplayName = undefined;
			if (parameterResource === 'group' && operation === 'delete') {
				parameterDisplayName = 'Group to Delete';
			} else if (parameterResource === 'group' && operation === 'get') {
				parameterDisplayName = 'Group to Get';
			} else if (parameterResource === 'group' && operation === 'update') {
				parameterDisplayName = 'Group to Update';
			} else if (parameterResource === 'user' && operation === 'delete') {
				parameterDisplayName = 'User to Delete';
			} else if (parameterResource === 'user' && operation === 'get') {
				parameterDisplayName = 'User to Get';
			} else if (parameterResource === 'user' && operation === 'update') {
				parameterDisplayName = 'User to Update';
			} else if (parameterResource === 'group' && operation === 'addGroup') {
				parameterDisplayName = 'Group';
			} else if (parameterResource === 'user' && operation === 'addGroup') {
				parameterDisplayName = 'User to Add';
			} else if (parameterResource === 'group' && operation === 'removeGroup') {
				parameterDisplayName = 'Group';
			} else if (parameterResource === 'user' && operation === 'removeGroup') {
				parameterDisplayName = 'User to Remove';
			}

			if (parameterDisplayName) {
				throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
					message: `The required ${parameterResource} doesn't match any existing one`,
					description: `Double-check the value in the parameter '${parameterDisplayName}' and try again`,
				});
			}
		}
		if (errorDetails?.some((x) => x.code === 'ObjectConflict' || x.code === 'ConflictingObjects')) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${resource} already exists`,
				description: errorMessage,
			});
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}
