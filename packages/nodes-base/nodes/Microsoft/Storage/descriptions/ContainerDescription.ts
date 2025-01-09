import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import { handleErrorPostReceive } from '../GenericFunctions';

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
						url: '=/{{ $parameter["container"] }}',
					},
					output: {
						postReceive: [handleErrorPostReceive],
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
					},
					output: {
						postReceive: [handleErrorPostReceive],
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
					},
					output: {
						postReceive: [handleErrorPostReceive],
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
					},
					output: {
						postReceive: [handleErrorPostReceive],
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
		name: 'container',
		default: '',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		placeholder: 'e.g. mycontainer',
		required: true,
		type: 'string',
		validateType: 'string',
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Container to Delete',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
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
		displayName: 'Container to Get',
		name: 'container',
		default: {
			mode: 'list',
			value: '',
		},
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
				preSend: [
					async function (
						this: IExecuteSingleFunctions,
						requestOptions: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> {
						return requestOptions;
					},
				],
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
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Filter',
		name: 'filter',
		default: '',
		description:
			'Filters the results to return only containers with a name that begins with the specified prefix',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['getAll'],
			},
		},
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
	// {
	// 	displayName: 'Fields',
	// 	name: 'fields',
	// 	default: [],
	// 	description: 'The fields to add to the output',
	// 	displayOptions: {
	// 		show: {
	// 			resource: ['container'],
	// 			operation: ['getAll'],
	// 			output: ['fields'],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			name: 'Metadata',
	// 			value: 'metadata',
	// 		},
	// 		{
	// 			name: 'Deleted',
	// 			value: 'deleted',
	// 		},
	// 		{
	// 			name: 'System',
	// 			value: 'system',
	// 		},
	// 	],
	// 	routing: {
	// 		send: {
	// 			property: 'include',
	// 			type: 'query',
	// 			value: '={{ $value.join(",") }}',
	// 		},
	// 	},
	// 	type: 'multiOptions',
	// },
];

export const containerFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
