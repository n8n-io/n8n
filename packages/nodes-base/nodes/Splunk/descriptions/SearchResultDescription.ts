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
		description: 'ID of the search whose results to retrieve, available after the final slash in the <code>id</code> field in API responses',
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
				displayName: 'Filter Expression',
				name: 'f',
				description: 'Expression to include only the named values. Examples: <code>f=s*</code> returns all the values that have names beginning with <code>s</code>. <code>f=qualifiedSearch&f=is_visible</code> returns the values for <code>qualifiedSearch</code> as well as <code>is_visible</code>.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Search Expression',
				name: 'search',
				description: 'Expression to match the queried results against. Examples: <code>search=foo</code> matches on any field with the string <code>foo</code> in the name. <code>search=field_name%3Dfield_value</code> restricts the match to a single field.',
				type: 'string',
				default: '',
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
