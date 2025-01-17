import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

export const containerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['documents'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a document',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/docs',
					},
				},
				action: 'Create container',
			},
		],
		default: 'getAll',
	},
];

export const createFields: INodeProperties[] = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: 'Unique ID for the document',
		required: true,
		displayOptions: {
			show: {
				resource: ['documents'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Custom Properties',
		name: 'customProperties',
		type: 'json',
		default: '{}',
		placeholder: '{ "LastName": "Andersen", "Address": { "State": "WA", "City": "Seattle" } }',
		description: 'User-defined JSON object representing the document properties.',
		required: true,
		displayOptions: {
			show: {
				resource: ['documents'],
				operation: ['create'],
			},
		},
	},
];

// const deleteFields: INodeProperties[] = [
// 	{
// 		displayName: 'Container to Delete',
// 		name: 'container',
// 		default: {
// 			mode: 'list',
// 			value: '',
// 		},
// 		displayOptions: {
// 			show: {
// 				resource: ['documents'],
// 				operation: ['delete'],
// 			},
// 		},
// 		modes: [
// 			{
// 				displayName: 'From List',
// 				name: 'list',
// 				type: 'list',
// 				typeOptions: {
// 					searchListMethod: 'getContainers',
// 					searchable: true,
// 				},
// 			},
// 			{
// 				displayName: 'By Name',
// 				name: 'id',
// 				placeholder: 'e.g. mycontainer',
// 				type: 'string',
// 			},
// 		],
// 		required: true,
// 		type: 'resourceLocator',
// 	},
// ];

// const getFields: INodeProperties[] = [
// 	{
// 		displayName: 'Container to Get',
// 		name: 'container',
// 		default: {
// 			mode: 'list',
// 			value: '',
// 		},
// 		displayOptions: {
// 			show: {
// 				resource: ['documents'],
// 				operation: ['get'],
// 			},
// 		},
// 		modes: [
// 			{
// 				displayName: 'From List',
// 				name: 'list',
// 				type: 'list',
// 				typeOptions: {
// 					searchListMethod: 'getContainers',
// 					searchable: true,
// 				},
// 			},
// 			{
// 				displayName: 'By Name',
// 				name: 'id',
// 				placeholder: 'e.g. mycontainer',
// 				type: 'string',
// 			},
// 		],
// 		required: true,
// 		type: 'resourceLocator',
// 	},
// ];

// const getAllFields: INodeProperties[] = [
// 	{
// 		displayName: 'Return All',
// 		name: 'returnAll',
// 		default: false,
// 		description: 'Whether to return all results or only up to a given limit',
// 		displayOptions: {
// 			show: {
// 				resource: ['documents'],
// 				operation: ['getAll'],
// 			},
// 		},
// 		routing: {
// 			send: {
// 				preSend: [
// 					async function (
// 						this: IExecuteSingleFunctions,
// 						requestOptions: IHttpRequestOptions,
// 					): Promise<IHttpRequestOptions> {
// 						return requestOptions;
// 					},
// 				],
// 			},
// 		},
// 		type: 'boolean',
// 	},
// 	{
// 		displayName: 'Limit',
// 		name: 'limit',
// 		default: 50,
// 		description: 'Max number of results to return',
// 		displayOptions: {
// 			show: {
// 				resource: ['documents'],
// 				operation: ['getAll'],
// 				returnAll: [false],
// 			},
// 		},
// 		routing: {
// 			send: {
// 				property: 'maxresults',
// 				type: 'query',
// 				value: '={{ $value }}',
// 			},
// 		},
// 		type: 'number',
// 		typeOptions: {
// 			minValue: 1,
// 		},
// 		validateType: 'number',
// 	},
// 	{
// 		displayName: 'Filter',
// 		name: 'filter',
// 		default: '',
// 		description:
// 			'Filters the results to return only containers with a name that begins with the specified prefix',
// 		displayOptions: {
// 			show: {
// 				resource: ['documents'],
// 				operation: ['getAll'],
// 			},
// 		},
// 		placeholder: 'e.g. mycontainer',
// 		routing: {
// 			send: {
// 				property: 'prefix',
// 				type: 'query',
// 				value: '={{ $value ? $value : undefined }}',
// 			},
// 		},
// 		type: 'string',
// 		validateType: 'string',
// 	},
// ];

export const containerFields: INodeProperties[] = [
	...createFields,
	// ...deleteFields,
	// ...getFields,
	// ...getAllFields,
];
