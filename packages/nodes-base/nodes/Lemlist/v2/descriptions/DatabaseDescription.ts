import type { INodeProperties } from 'n8n-workflow';

export const databaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'searchPeople',
		options: [
			{
				name: 'Get Companies Schema',
				value: 'getCompaniesSchema',
				description: 'Get the schema for companies database',
				action: 'Get companies schema',
			},
			{
				name: 'Get People Schema',
				value: 'getPeopleSchema',
				description: 'Get the schema for people database',
				action: 'Get people schema',
			},
			{
				name: 'Search Companies',
				value: 'searchCompanies',
				description: 'Search the companies database',
				action: 'Search companies database',
			},
			{
				name: 'Search People',
				value: 'searchPeople',
				description: 'Search the people database',
				action: 'Search people database',
			},
		],
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
	},
];

export const databaseFields: INodeProperties[] = [
	// ----------------------------------
	//        database: searchPeople
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		default: {},
		placeholder: 'Add Filter',
		description:
			'Filters to apply to the people search. Use "Get People Schema" to see available filter IDs.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['searchPeople'],
			},
		},
		options: [
			{
				name: 'filterValues',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Filter ID',
						name: 'filterId',
						type: 'string',
						default: '',
						description: 'The filter identifier (e.g., "job_title", "location", "company_size")',
					},
					{
						displayName: 'Include Values',
						name: 'in',
						type: 'string',
						default: '',
						description: 'Comma-separated list of values to include',
					},
					{
						displayName: 'Exclude Values',
						name: 'out',
						type: 'string',
						default: '',
						description: 'Comma-separated list of values to exclude',
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
				resource: ['database'],
				operation: ['searchPeople'],
			},
		},
		options: [
			{
				displayName: 'Excludes',
				name: 'excludes',
				type: 'string',
				default: '',
				description: 'Comma-separated list of properties to exclude from the results',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				description: 'Number of results to return (1-100)',
			},
		],
	},

	// ----------------------------------
	//        database: searchCompanies
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		default: {},
		placeholder: 'Add Filter',
		description:
			'Filters to apply to the companies search. Use "Get Companies Schema" to see available filter IDs.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['searchCompanies'],
			},
		},
		options: [
			{
				name: 'filterValues',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Filter ID',
						name: 'filterId',
						type: 'string',
						default: '',
						description: 'The filter identifier (e.g., "industry", "company_size", "location")',
					},
					{
						displayName: 'Include Values',
						name: 'in',
						type: 'string',
						default: '',
						description: 'Comma-separated list of values to include',
					},
					{
						displayName: 'Exclude Values',
						name: 'out',
						type: 'string',
						default: '',
						description: 'Comma-separated list of values to exclude',
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
				resource: ['database'],
				operation: ['searchCompanies'],
			},
		},
		options: [
			{
				displayName: 'Excludes',
				name: 'excludes',
				type: 'string',
				default: '',
				description: 'Comma-separated list of properties to exclude from the results',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				description: 'Number of results to return (1-100)',
			},
		],
	},
];
