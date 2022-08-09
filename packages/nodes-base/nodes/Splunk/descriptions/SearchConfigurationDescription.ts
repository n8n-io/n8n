import {
	INodeProperties,
} from 'n8n-workflow';

export const searchConfigurationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a search configuration',
				action: 'Delete a search configuration',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a search configuration',
				action: 'Get a search configuration',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all search configurations',
				action: 'Get all search configurations',
			},
		],
		default: 'delete',
	},
];

export const searchConfigurationFields: INodeProperties[] = [
	// ----------------------------------------
	//       searchConfiguration: delete
	// ----------------------------------------
	{
		displayName: 'Search Configuration ID',
		name: 'searchConfigurationId',
		description: 'ID of the search configuration to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//         searchConfiguration: get
	// ----------------------------------------
	{
		displayName: 'Search Configuration ID',
		name: 'searchConfigurationId',
		description: 'ID of the search configuration to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//       searchConfiguration: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'searchConfiguration',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Add Orphan Field',
				name: 'add_orphan_field',
				description: 'Whether to include a boolean value for each saved search to show whether the search is orphaned, meaning that it has no valid owner',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'List Default Actions',
				name: 'listDefaultActionArgs',
				type: 'boolean',
				default: false,
			},
		],
	},
];
