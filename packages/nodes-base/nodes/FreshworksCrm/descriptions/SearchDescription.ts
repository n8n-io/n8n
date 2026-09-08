import type { INodeProperties } from 'n8n-workflow';

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['search'],
			},
		},
		options: [
			{
				name: 'Query',
				value: 'query',
				description: 'Search for records by entering search queries of your choice',
				action: 'Query a search',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Search for the name or email address of records',
				action: 'Lookup a search',
			},
		],
		default: 'query',
	},
];

export const searchFields: INodeProperties[] = [
	// ----------------------------------------
	//          Search: query
	// ----------------------------------------
	{
		displayName: 'Search term',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['query'],
			},
		},
		description: 'Enter a term that will be used for searching entities',
	},
	{
		displayName: 'Search on entities',
		name: 'entities',
		type: 'multiOptions',
		options: [
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Deal',
				value: 'deal',
			},
			{
				name: 'Sales account',
				value: 'sales_account',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['query'],
			},
		},
		description: 'Enter a term that will be used for searching entities',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['query'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 25,
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['query'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	// ----------------------------------------
	//          Search: lookup
	// ----------------------------------------
	{
		displayName: 'Search field',
		name: 'searchField',
		type: 'options',
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'Custom field',
				value: 'customField',
				description:
					'Only allowed custom fields of type "Text field", "Number", "Dropdown" or "Radio button"',
			},
		],
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['lookup'],
			},
		},
		description: 'Field against which the entities have to be searched',
	},
	{
		displayName: 'Custom field name',
		name: 'customFieldName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['lookup'],
				searchField: ['customField'],
			},
		},
	},
	{
		displayName: 'Custom field value',
		name: 'customFieldValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['lookup'],
				searchField: ['customField'],
			},
		},
	},
	{
		displayName: 'Field value',
		name: 'fieldValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['lookup'],
				searchField: ['email', 'name'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['search'],
				operation: ['lookup'],
			},
		},
		options: [
			{
				displayName: 'Entities',
				name: 'entities',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Sales account',
						value: 'sales_account',
					},
				],

				description:
					"Use 'entities' to query against related entities. You can include multiple entities at once, provided the field is available in both entities or else you'd receive an error response.",
			},
		],
	},
];
