import type { INodeProperties } from 'n8n-workflow';

export const ticketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
				action: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
				action: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket',
				action: 'Get a ticket',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many tickets',
				action: 'Get many tickets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
				action: 'Update a ticket',
			},
		],
		default: 'delete',
	},
];

export const ticketFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                ticket:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket type name or ID',
		name: 'ticketType',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSATicketsTypes',
		},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assigned agent name or ID',
				name: 'agent_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getHaloPSAAgents',
				},
			},
			{
				displayName: 'Start date',
				name: 'startdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Target date',
				name: 'targetdate',
				type: 'dateTime',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete', 'get'],
			},
		},
	},

	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get', 'getAll'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                ticket:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['ticket'],
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
		default: 50,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Active status',
				name: 'activeStatus',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Active only',
						value: 'active',
						description: 'Whether to include active customers in the response',
					},
					{
						name: 'All',
						value: 'all',
						description: 'Whether to include active and inactive customers in the response',
					},
					{
						name: 'Inactive only',
						value: 'inactive',
						description: 'Whether to include inactive Customers in the responsee',
					},
				],
			},
			{
				displayName: 'Text to filter by',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Filter tickets by your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                ticket:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assigned agent name or ID',
				name: 'agent_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getHaloPSAAgents',
				},
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start date',
				name: 'startdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Target date',
				name: 'targetdate',
				type: 'dateTime',
				default: '',
			},
		],
	},
];
