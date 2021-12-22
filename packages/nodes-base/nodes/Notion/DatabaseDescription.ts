import {
	INodeProperties,
} from 'n8n-workflow';

export const databaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				version: [
					2,
				],
				resource: [
					'database',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all databases',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'search databases using text search',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				version: [
					1,
				],
				resource: [
					'database',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all databases',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

export const databaseFields = [

	/* -------------------------------------------------------------------------- */
	/*                                database:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database Link or ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'get',
				],
			},
		},
		description: `The Database URL from Notion's 'copy link' functionality (or just the ID contained within the URL)`,
	},
	/* -------------------------------------------------------------------------- */
	/*                                database:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'database',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return',
	},
	{
		displayName: 'Simplify Output',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				version: [
					2,
				],
				resource: [
					'database',
				],
				operation: [
					'getAll',
					'get',
				],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	/* -------------------------------------------------------------------------- */
	/*                                database:search                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Search Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'search',
				],
			},
		},
		description: 'The text to search for',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'search',
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
					'database',
				],
				operation: [
					'search',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return',
	},
	{
		displayName: 'Simplify Output',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'search',
				],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'search',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				placeholder: 'Add Sort',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Sort',
						name: 'sortValue',
						values: [
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'ascending',
									},
									{
										name: 'Descending',
										value: 'descending',
									},
								],
								default: 'descending',
								description: 'The direction to sort',
							},
							{
								displayName: 'Timestamp',
								name: 'timestamp',
								type: 'options',
								options: [
									{
										name: 'Last Edited Time',
										value: 'last_edited_time',
									},
								],
								default: 'last_edited_time',
								description: `The name of the timestamp to sort against`,
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
