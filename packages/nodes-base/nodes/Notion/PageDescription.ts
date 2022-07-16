import {
	INodeProperties,
} from 'n8n-workflow';

import {
	blocks,
} from './Blocks';

export const pageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				version: [
					1,
				],
				resource: [
					'page',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page',
				action: 'Create a page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a page',
				action: 'Get a page',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Text search of pages',
				action: 'Search a page',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				version: [
					2,
				],
				resource: [
					'page',
				],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a page',
				action: 'Archive a page',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a page',
				action: 'Create a page',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Text search of pages',
				action: 'Search a page',
			},
		],
		default: 'create',
	},
];

export const pageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                page:archive                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page Link or ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				version: [
					2,
				],
				resource: [
					'page',
				],
				operation: [
					'archive',
				],
			},
		},
		description: 'The Page URL from Notion\'s \'copy link\' functionality (or just the ID contained within the URL)',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				version: [
					2,
				],
				resource: [
					'page',
				],
				operation: [
					'archive',
				],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	/* -------------------------------------------------------------------------- */
	/*                                page:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Parent Page ID or Link',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The URL from Notion\'s \'copy link\' functionality (or just the ID contained within the URL)',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Page title. Appears at the top of the page and can be found via Quick Find.',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
				],
				operation: [
					'create',
				],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	...blocks('page', 'create'),
	/* -------------------------------------------------------------------------- */
	/*                                page:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page Link or ID',
		name: 'pageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				version: [
					1,
				],
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The Page URL from Notion\'s \'copy link\' functionality (or just the ID contained within the URL)',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				version: [
					1,
				],
				resource: [
					'page',
				],
				operation: [
					'get',
				],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	/* -------------------------------------------------------------------------- */
	/*                                page:search                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Search Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'page',
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
					'page',
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
					'page',
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
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'page',
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
					'page',
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
				displayName: 'Filters',
				name: 'filter',
				placeholder: 'Add Filter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Filter',
						name: 'filters',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'options',
								options: [
									{
										name: 'Object',
										value: 'object',
									},
								],
								default: 'object',
								description: 'The name of the property to filter by',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'options',
								options: [
									{
										name: 'Database',
										value: 'database',
									},
									{
										name: 'Page',
										value: 'page',
									},
								],
								default: '',
								description: 'The value of the property to filter by',
							},
						],
					},
				],
			},
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
								description: 'The name of the timestamp to sort against',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
