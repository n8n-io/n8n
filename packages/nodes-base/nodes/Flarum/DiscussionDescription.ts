import type { INodeProperties } from 'n8n-workflow';

export const discussionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['discussion'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a discussion',
				action: 'Create a discussion',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a discussion',
				action: 'Get a discussion',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all discussions',
				action: 'Get all discussions',
			},
		],
		default: 'create',
	},
];

export const discussionFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                discussion:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['discussion'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['discussion'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['discussion'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                discussion:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Discussion ID',
		name: 'discussionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['discussion'],
				operation: ['get'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                discussion:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['discussion'],
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
				resource: ['discussion'],
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
				resource: ['discussion'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: '',
			},
		],
	},
];