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
		default: 'create',
	},
];

export const ticketFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                ticket:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Pipeline name or ID',
		name: 'pipelineId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTicketPipelines',
		},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage name or ID',
		name: 'stageId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTicketStages',
			loadOptionsDependsOn: ['pipelineId'],
		},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'The stage ID of the pipeline the ticket is in; depends on Pipeline ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Ticket name',
		name: 'ticketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Ticket properties',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add property',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Company names or IDs',
				name: 'associatedCompanyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description:
					'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact names or IDs',
				name: 'associatedContactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
				description:
					'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketCategories',
				},
				default: '',
				description:
					'Main reason customer reached out for help. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the ticket was closed. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Create date',
				name: 'createDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the ticket was created. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the ticket',
			},
			{
				displayName: 'Priority name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPriorities',
				},
				default: '',
				description:
					'The level of attention needed on the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resolution name or ID',
				name: 'resolution',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketResolutions',
				},
				default: '',
				description:
					'The action taken to resolve the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Source name or ID',
				name: 'source',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketSources',
				},
				default: '',
				description:
					'Channel where ticket was originally submitted. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket owner name or ID',
				name: 'ticketOwnerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The user from your team that the ticket is assigned to. You can assign additional users to a ticket record by creating a custom HubSpot user property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ticket:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket to update',
		name: 'ticketId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchTickets',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Ticket ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Company names or IDs',
				name: 'associatedCompanyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description:
					'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact names or IDs',
				name: 'associatedContactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
				description:
					'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketCategories',
				},
				default: '',
				description:
					'Main reason customer reached out for help. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the ticket was closed. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Create date',
				name: 'createDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the ticket was created. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the ticket',
			},
			{
				displayName: 'Pipeline name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPipelines',
				},
				default: '',
				description:
					'The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPriorities',
				},
				default: '',
				description:
					'The level of attention needed on the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Resolution name or ID',
				name: 'resolution',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketResolutions',
				},
				default: '',
				description:
					'The action taken to resolve the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Source name or ID',
				name: 'source',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketSources',
				},
				default: '',
				description:
					'Channel where ticket was originally submitted. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage name or ID',
				name: 'stageId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketStages',
					loadOptionsDependsOn: ['updateFields.pipelineId'],
				},
				default: '',
				description:
					'The stage ID of the pipeline the ticket is in; depends on Pipeline ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket name',
				name: 'ticketName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ticket owner name or ID',
				name: 'ticketOwnerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The user from your team that the ticket is assigned to. You can assign additional users to a ticket record by creating a custom HubSpot user property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  ticket:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket to get',
		name: 'ticketId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchTickets',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Ticket ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include deleted',
				name: 'includeDeleted',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Ticket properties to include',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTicketProperties',
				},
				default: [],
				description:
					'Whether to include specific Ticket properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties with history',
				name: 'propertiesWithHistory',
				type: 'string',
				default: '',
				description:
					"Works similarly to properties=, but this parameter will include the history for the specified property, instead of just including the current value. Use this parameter when you need the full history of changes to a property's value.",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 ticket:getAll                              */
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
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Ticket properties to include',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTicketProperties',
				},
				default: [],
				description:
					'Whether to include specific Ticket properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties with history',
				name: 'propertiesWithHistory',
				type: 'string',
				default: '',
				description:
					"Works similarly to properties=, but this parameter will include the history for the specified property, instead of just including the current value. Use this parameter when you need the full history of changes to a property's value.",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 ticket:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket to delete',
		name: 'ticketId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchTickets',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Ticket ID',
						},
					},
				],
			},
		],
	},
];
