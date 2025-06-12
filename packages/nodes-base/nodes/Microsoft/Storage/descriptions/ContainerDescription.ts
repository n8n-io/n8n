import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
	ResourceMapperValue,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	handleErrorPostReceive,
	HeaderConstants,
	parseContainerList,
	parseHeaders,
	XMsVersion,
} from '../GenericFunctions';

export const containerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['container'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'PUT',
						qs: {
							restype: 'container',
						},
						url: '=/{{ $parameter["containerCreate"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								return [
									{
										json: parseHeaders(response.headers),
									},
								];
							},
						],
					},
				},
				action: 'Create container',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						qs: {
							restype: 'container',
						},
						url: '=/{{ $parameter["container"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								return [
									{
										json: parseHeaders(response.headers),
									},
								];
							},
						],
					},
				},
				action: 'Delete container',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						qs: {
							restype: 'container',
						},
						url: '=/{{ $parameter["container"] }}',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								_data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								const { metadata, ...properties } = parseHeaders(response.headers);
								const simplify = this.getNodeParameter('options.simplify', true) as boolean;
								if (simplify) {
									delete properties.contentLength;
									delete properties.server;
									delete properties.requestId;
									delete properties.version;
									delete properties.date;
									delete properties.connection;
								}
								return [
									{
										json: {
											name: (this.getNodeParameter('container') as ResourceMapperValue).value,
											properties,
											...(metadata ? { metadata: metadata as IDataObject } : {}),
										},
									},
								];
							},
						],
					},
				},
				action: 'Get container',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of containers',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						qs: {
							comp: 'list',
						},
						url: '/',
						headers: {
							[HeaderConstants.X_MS_DATE]: '={{ new Date().toUTCString() }}',
							[HeaderConstants.X_MS_VERSION]: XMsVersion,
						},
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								_response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								return [
									{
										json: await parseContainerList(data[0].json as unknown as string),
									},
								];
							},
						],
					},
				},
				action: 'Get many container',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Container Name',
		name: 'containerCreate',
		default: '',
		description: 'The name of the new container',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		placeholder: 'e.g. mycontainer',
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const container = this.getNodeParameter('containerCreate') as string;
						if (container.length < 3 || container.length > 63) {
							throw new NodeOperationError(
								this.getNode(),
								"'Container Name' must be from 3 through 63 characters long",
							);
						}
						if (/[A-Z]/.test(container)) {
							throw new NodeOperationError(
								this.getNode(),
								"All letters  in 'Container Name' must be lowercase",
							);
						}
						if (!/^[a-z0-9-]+$/.test(container)) {
							throw new NodeOperationError(
								this.getNode(),
								"'Container Name' can contain only letters, numbers, and the hyphen/minus (-) character",
							);
						}
						if (!/^[a-z0-9].*[a-z0-9]$/.test(container)) {
							throw new NodeOperationError(
								this.getNode(),
								"'Container Name' must start or end with a letter or number",
							);
						}
						if (/--/.test(container)) {
							throw new NodeOperationError(
								this.getNode(),
								"Consecutive hyphens are not permitted in 'Container Name'",
							);
						}

						return requestOptions;
					},
				],
			},
		},
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Access Level',
				name: 'accessLevel',
				default: '',
				options: [
					{
						name: 'Blob',
						value: 'blob',
						description:
							"Specifies public read access for blobs. Blob data within this container can be read via anonymous request, but container data isn't available. Clients can't enumerate blobs within the container via anonymous request.",
					},
					{
						name: 'Container',
						value: 'container',
						description:
							"Specifies full public read access for container and blob data. Clients can enumerate blobs within the container via anonymous request, but they can't enumerate containers within the storage account.",
					},
					{
						name: 'Private',
						value: '',
						description: 'Container data is private to the account owner',
					},
				],
				routing: {
					request: {
						headers: {
							[HeaderConstants.X_MS_BLOB_PUBLIC_ACCESS]: '={{ $value || undefined }}',
						},
					},
				},
				type: 'options',
				validateType: 'options',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				default: [],
				description: 'A name-value pair to associate with the container as metadata',
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								default: '',
								description:
									'Names must adhere to the naming rules for <a href="https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/">C# identifiers</a>',
								type: 'string',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								default: '',
								type: 'string',
							},
						],
					},
				],
				placeholder: 'Add metadata',
				routing: {
					send: {
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								requestOptions.headers ??= {};
								const metadata = this.getNodeParameter('options.metadata') as IDataObject;
								for (const data of metadata.metadataValues as IDataObject[]) {
									requestOptions.headers[
										`${HeaderConstants.PREFIX_X_MS_META}${data.fieldName as string}`
									] = data.fieldValue as string;
								}
								return requestOptions;
							},
						],
					},
				},
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container to delete',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Container',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the container to get',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getContainers',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. mycontainer',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				async pagination(
					this: IExecutePaginationFunctions,
					requestOptions: DeclarativeRestApiSettings.ResultOptions,
				): Promise<INodeExecutionData[]> {
					let executions: INodeExecutionData[] = [];
					let marker: string | undefined = undefined;
					requestOptions.options.qs ??= {};

					do {
						requestOptions.options.qs.marker = marker;
						const responseData = await this.makeRoutingRequest(requestOptions);
						marker = responseData[0].json.nextMarker as string | undefined;
						executions = executions.concat(
							(responseData[0].json.containers as IDataObject[]).map((item) => ({ json: item })),
						);
					} while (marker);

					return executions;
				},
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			send: {
				property: 'maxresults',
				type: 'query',
				value: '={{ $value }}',
			},
			output: {
				postReceive: [
					async function (
						this: IExecuteSingleFunctions,
						data: INodeExecutionData[],
						_response: IN8nHttpFullResponse,
					): Promise<INodeExecutionData[]> {
						return (data[0].json.containers as IDataObject[]).map((item) => ({ json: item }));
					},
				],
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				default: [],
				description: 'The fields to add to the output',
				options: [
					{
						name: 'Metadata',
						value: 'metadata',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
					{
						name: 'System',
						value: 'system',
					},
				],
				routing: {
					send: {
						property: 'include',
						type: 'query',
						value: '={{ $value.join(",") || undefined }}',
					},
				},
				type: 'multiOptions',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				default: '',
				description:
					'Filters the results to return only containers with a name that begins with the specified prefix',
				placeholder: 'e.g. mycontainer',
				routing: {
					send: {
						property: 'prefix',
						type: 'query',
						value: '={{ $value ? $value : undefined }}',
					},
				},
				type: 'string',
				validateType: 'string',
			},
		],
		placeholder: 'Add option',
		type: 'collection',
	},
];

export const containerFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
