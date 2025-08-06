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
	INodePropertyOptions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

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
			requestInterval: 0,
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
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;
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

		// Operation specific errors
		if (resource === 'group') {
			if (operation === 'create') {
			} else if (operation === 'delete') {
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group to Delete' and try again",
					});
				}
			} else if (operation === 'get') {
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
			} else if (operation === 'update') {
				if (
					errorCode === 'BadRequest' &&
					errorMessage === 'Empty Payload. JSON content expected.'
				) {
					// Ignore empty payload error. Currently n8n deletes the empty body object from the request.
					return data;
				}
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group to Update' and try again",
					});
				}
			}
		} else if (resource === 'user') {
			if (operation === 'addGroup') {
				if (
					errorCode === 'Request_BadRequest' &&
					errorMessage ===
						"One or more added object references already exist for the following modified properties: 'members'."
				) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user is already in the group',
						description:
							'The specified user cannot be added to the group because they are already a member',
					});
				} else if (errorCode === 'Request_ResourceNotFound') {
					const group = this.getNodeParameter('group.value') as string;
					if (errorMessage.includes(group)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required group doesn't match any existing one",
							description: "Double-check the value in the parameter 'Group' and try again",
						});
					} else {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required user doesn't match any existing one",
							description: "Double-check the value in the parameter 'User to Add' and try again",
						});
					}
				}
			} else if (operation === 'create') {
			} else if (operation === 'delete') {
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User to Delete' and try again",
					});
				}
			} else if (operation === 'get') {
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User to Get' and try again",
					});
				}
			} else if (operation === 'getAll') {
			} else if (operation === 'removeGroup') {
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user is not in the group',
						description:
							'The specified user cannot be removed from the group because they are not a member of the group',
					});
				} else if (
					errorCode === 'Request_UnsupportedQuery' &&
					errorMessage ===
						"Unsupported referenced-object resource identifier for link property 'members'."
				) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user ID is invalid',
						description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
					});
				}
			} else if (operation === 'update') {
				if (
					errorCode === 'BadRequest' &&
					errorMessage === 'Empty Payload. JSON content expected.'
				) {
					// Ignore empty payload error. Currently n8n deletes the empty body object from the request.
					return data;
				}
				if (errorCode === 'Request_ResourceNotFound') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User to Update' and try again",
					});
				}
			}
		}

		// Generic errors
		if (
			errorCode === 'Request_BadRequest' &&
			errorMessage.startsWith('Invalid object identifier')
		) {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';

			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${parameterResource} ID is invalid`,
				description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
			});
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

export async function getGroupProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#groups');
	const metadata = await parseStringPromise(response as string, {
		explicitArray: false,
	});

	/* eslint-disable */
	const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
		.find((x: any) => x['$']['Namespace'] === 'microsoft.graph')
		['EntityType'].filter((x: any) =>
			['entity', 'directoryObject', 'group'].includes(x['$']['Name']),
		);
	let properties = entities
		.flatMap((x: any) => x['Property'])
		.map((x: any) => x['$']['Name']) as string[];
	/* eslint-enable */

	properties = properties.filter(
		(x) => !['id', 'isArchived', 'hasMembersWithLicenseErrors'].includes(x),
	);

	properties = properties.sort();

	for (const property of properties) {
		returnData.push({
			name: property,
			value: property,
		});
	}

	return returnData;
}

export async function getUserProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const response = await microsoftApiRequest.call(this, 'GET', '/$metadata#users');
	const metadata = await parseStringPromise(response as string, {
		explicitArray: false,
	});

	/* eslint-disable */
	const entities = metadata['edmx:Edmx']['edmx:DataServices']['Schema']
		.find((x: any) => x['$']['Namespace'] === 'microsoft.graph')
		['EntityType'].filter((x: any) =>
			['entity', 'directoryObject', 'user'].includes(x['$']['Name']),
		);
	let properties = entities
		.flatMap((x: any) => x['Property'])
		.map((x: any) => x['$']['Name']) as string[];
	/* eslint-enable */

	// signInActivity requires AuditLog.Read.All
	// mailboxSettings MailboxSettings.Read
	properties = properties.filter(
		(x) =>
			!['id', 'deviceEnrollmentLimit', 'mailboxSettings', 'print', 'signInActivity'].includes(x),
	);

	properties = properties.sort();

	for (const property of properties) {
		returnData.push({
			name: property,
			value: property,
		});
	}
	return returnData;
}

export async function getGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: any;
	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'/groups',
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,displayName',
		};
		const headers: IDataObject = {};
		if (filter) {
			headers.ConsistencyLevel = 'eventual';
			qs.$search = `"displayName:${filter}"`;
		}
		response = await microsoftApiRequest.call(this, 'GET', '/groups', {}, qs, headers);
	}

	const groups: Array<{
		id: string;
		displayName: string;
	}> = response.value;

	const results: INodeListSearchItems[] = groups
		.map((g) => ({
			name: g.displayName,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: any;
	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'/users',
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,displayName',
		};
		const headers: IDataObject = {};
		if (filter) {
			qs.$filter = `startsWith(displayName, '${filter}') OR startsWith(userPrincipalName, '${filter}')`;
		}
		response = await microsoftApiRequest.call(this, 'GET', '/users', {}, qs, headers);
	}

	const users: Array<{
		id: string;
		displayName: string;
	}> = response.value;

	const results: INodeListSearchItems[] = users
		.map((u) => ({
			name: u.displayName,
			value: u.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}
