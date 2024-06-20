import type { INodeProperties } from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	// ----------------------------------
	//         list
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive/Unarchive a list',
				action: 'Archive/unarchive a list',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new list',
				action: 'Create a list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a list',
				action: 'Get a list',
			},
			{
				name: 'Get Cards',
				value: 'getCards',
				description: 'Get all the cards in a list',
				action: 'Get all cards in a list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many lists',
				action: 'Get many lists',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a list',
				action: 'Update a list',
			},
		],
		default: 'create',
	},
];

export const listFields: INodeProperties[] = [
	// ----------------------------------
	//         list:archive
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['archive'],
				resource: ['list'],
			},
		},
		description: 'The ID of the list to archive or unarchive',
	},
	{
		displayName: 'Archive',
		name: 'archive',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['archive'],
				resource: ['list'],
			},
		},
		description: 'Whether the list should be archived or unarchived',
	},

	// ----------------------------------
	//         list:create
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'idBoard',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		description: 'The ID of the board the list should be created in',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'My list',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		description: 'The name of the list',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'List Source',
				name: 'idListSource',
				type: 'string',
				default: '',
				description: 'ID of the list to copy into the new list',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: 'bottom',
				description: 'The position of the new list. top, bottom, or a positive float.',
			},
		],
	},

	// ----------------------------------
	//         list:getCards
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getCards'],
				resource: ['list'],
			},
		},
		description: 'The ID of the list to get cards',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['getCards'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 20,
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['getCards'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getCards'],
				resource: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},
	// ----------------------------------
	//         list:get
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['list'],
			},
		},
		description: 'The ID of the list to get',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         list:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['list'],
			},
		},
		description: 'The ID of the board',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['list'],
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
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 20,
		displayOptions: {
			show: {
				resource: ['list'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         list:update
	// ----------------------------------
	{
		displayName: 'List ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['list'],
			},
		},
		description: 'The ID of the list to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['list'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Board ID',
				name: 'idBoard',
				type: 'string',
				default: '',
				description: 'ID of a board the list should be moved to',
			},
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether the list is closed',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name of the list',
			},
			{
				displayName: 'Position',
				name: 'pos',
				type: 'string',
				default: 'bottom',
				description: 'The position of the list. top, bottom, or a positive float.',
			},
			{
				displayName: 'Subscribed',
				name: 'subscribed',
				type: 'boolean',
				default: false,
				description: 'Whether the acting user is subscribed to the list',
			},
		],
	},
];
