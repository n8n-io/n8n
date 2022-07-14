import {
	INodeProperties,
} from 'n8n-workflow';

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a tag',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all tags',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
			},
		},
	},
];

export const tagFields: INodeProperties[] = [
	// ----------------------------------
	//       tag: delete
	// ----------------------------------
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'One or more tags to delete. Enter comma-separated values to delete multiple tags.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				displayName: 'Collection Name or ID',
				name: 'collectionId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
				default: '',
				description: 'It\'s possible to restrict remove action to just one collection. It\'s optional. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	// ----------------------------------
	//       tag: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Collection Name or ID',
				name: 'collectionId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
				default: '',
			},
		],
	},
];
