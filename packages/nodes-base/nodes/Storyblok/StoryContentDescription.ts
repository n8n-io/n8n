import type { INodeProperties } from 'n8n-workflow';

export const storyContentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['story'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a story',
				action: 'Get a story',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many stories',
				action: 'Get many stories',
			},
		],
		default: 'get',
	},
];

export const storyContentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                story:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['story'],
				operation: ['get'],
			},
		},
		description: 'The ID or slug of the story to get',
	},

	/* -------------------------------------------------------------------------- */
	/*                                story:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['story'],
				operation: ['getAll'],
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
				source: ['contentApi'],
				resource: ['story'],
				operation: ['getAll'],
				returnAll: [false],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				source: ['contentApi'],
				resource: ['story'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Starts With',
				name: 'starts_with',
				type: 'string',
				default: '',
				description: 'Filter by slug',
			},
		],
	},
];
