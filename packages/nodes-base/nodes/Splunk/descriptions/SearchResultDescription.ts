import {
	INodeProperties,
} from 'n8n-workflow';

export const searchResultOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'searchResult',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all search results for a search job',
			},
		],
		default: 'getAll',
	},
];

export const searchResultFields: INodeProperties[] = [
	// ----------------------------------------
	//           searchResult: getAll
	// ----------------------------------------
	{
		displayName: 'Search ID',
		name: 'searchJobId',
		description: 'ID of the search whose results to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'searchResult',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'searchResult',
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
					'searchResult',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'searchResult',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Key-Value Match',
				name: 'keyValueMatch',
				description: 'Key-value pair to match against. Example: if "Key" is set to <code>user</code> and "Field" is set to <code>john</code>, only the results where <code>user</code> is <code>john</code> will be returned. ',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Key-Value Pair',
				options: [
					{
						displayName: 'Key-Value Pair',
						name: 'keyValuePair',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								description: 'Key to match against',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								description: 'value to match against',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
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
					'searchResult',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Add Summary to Metadata',
				name: 'add_summary_to_metadata',
				description: 'Whether to include field summary statistics in the response',
				type: 'boolean',
				default: false,
			},
		],
	},
];
