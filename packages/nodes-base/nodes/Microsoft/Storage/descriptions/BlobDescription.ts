import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { handleErrorPostReceive, HeaderConstants } from '../GenericFunctions';

export const blobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['blob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new blob or replaces an existing blob within a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'PUT',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blob"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Create blob',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a blob',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blob"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Delete blob',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific blob',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/{{ $parameter["container"] }}/{{ $parameter["blob"] }}',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							async function (
								this: IExecuteSingleFunctions,
								data: INodeExecutionData[],
								response: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								data[0].json.headers = response.headers;
								return data;
							},
						],
					},
				},
				action: 'Get blob',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of blobs',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						qs: {
							restype: 'container',
							comp: 'list',
						},
						url: '=/{{ $parameter["container"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
					},
				},
				action: 'Get many blobs',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Container Name',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
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
		displayName: 'Blob Name',
		name: 'blob',
		default: '',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		placeholder: 'e.g. myblob',
		required: true,
		type: 'string',
		validateType: 'string',
	},
	{
		displayName: 'From',
		name: 'from',
		default: 'binary',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Binary',
				value: 'binary',
			},
			{
				name: 'URL',
				value: 'url',
			},
		],
		required: true,
		type: 'options',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		default: 'data',
		description: 'The name of the input binary field containing the file to be written',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
				from: ['binary'],
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName') as string;

						const binaryData = this.helpers.assertBinaryData(binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryPropertyName);

						requestOptions.headers ??= {};
						requestOptions.headers[HeaderConstants.CONTENT_LENGTH] = binaryDataBuffer.length;
						requestOptions.headers[HeaderConstants.X_MS_BLOB_TYPE] = 'BlockBlob';
						if (binaryData.mimeType) {
							requestOptions.headers[HeaderConstants.CONTENT_TYPE] = binaryData.mimeType;
						}
						if (binaryData.fileName) {
							requestOptions.headers[HeaderConstants.X_MS_BLOB_CONTENT_DISPOSITION] =
								`attachment; filename="${binaryData.fileName}"`;
						}

						requestOptions.body = binaryDataBuffer;

						return requestOptions;
					},
				],
			},
		},
		type: 'string',
	},
	{
		displayName: 'URL',
		name: 'url',
		default: 'data',
		description: 'URL where to read of the blob contents from',
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['create'],
				from: ['url'],
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						const url = this.getNodeParameter('url') as string;

						requestOptions.headers ??= {};
						requestOptions.headers[HeaderConstants.CONTENT_LENGTH] = 0;
						requestOptions.headers[HeaderConstants.X_MS_BLOB_TYPE] = 'BlockBlob';
						requestOptions.headers[HeaderConstants.X_MS_COPY_SOURCE] = url;

						return requestOptions;
					},
				],
			},
		},
		type: 'string',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container Name',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
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
	{
		displayName: 'Blob to Delete',
		name: 'blob',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBlobs',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. myblob',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Container Name',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
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
		displayName: 'Blob to Get',
		name: 'blob',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getBlobs',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'id',
				placeholder: 'e.g. myblob',
				type: 'string',
			},
		],
		required: true,
		type: 'resourceLocator',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Container Name',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['blob'],
				operation: ['getAll'],
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

export const blobFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
