import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get Many',
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
		displayName: 'Pipeline Name or ID',
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
			'The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Stage Name or ID',
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
			'The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Ticket Name',
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
		description: 'The ID of the pipeline the ticket is in',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Company Names or IDs',
				name: 'associatedCompanyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description:
					'Companies associated with the ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Names or IDs',
				name: 'associatedContactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
				description:
					'Contacts associated with the ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Category Name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketCategories',
				},
				default: '',
				description:
					'Main reason customer reached out for help. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description: 'The date the ticket was closed',
			},
			{
				displayName: 'Create Date',
				name: 'createDate',
				type: 'dateTime',
				default: '',
				description: 'The date the ticket was created',
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
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPriorities',
				},
				default: '',
				description:
					'The level of attention needed on the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Resolution Name or ID',
				name: 'resolution',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketResolutions',
				},
				default: '',
				description:
					'The action taken to resolve the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Source Name or ID',
				name: 'source',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketSources',
				},
				default: '',
				description:
					'Channel where ticket was originally submitted. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket Owner Name or ID',
				name: 'ticketOwnerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The user from your team that the ticket is assigned to. You can assign additional users to a ticket record by creating a custom HubSpot user property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ticket:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular ticket',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Company Names or IDs',
				name: 'associatedCompanyIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
				description:
					'Companies associated with the ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Names or IDs',
				name: 'associatedContactIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
				description:
					'Contact associated with the ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Category Name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketCategories',
				},
				default: '',
				description:
					'Main reason customer reached out for help. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description: 'The date the ticket was closed',
			},
			{
				displayName: 'Create Date',
				name: 'createDate',
				type: 'dateTime',
				default: '',
				description: 'The date the ticket was created',
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
				displayName: 'Pipeline Name or ID',
				name: 'pipelineId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPipelines',
				},
				default: '',
				description:
					'The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority Name or ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketPriorities',
				},
				default: '',
				description:
					'The level of attention needed on the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Resolution Name or ID',
				name: 'resolution',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketResolutions',
				},
				default: '',
				description:
					'The action taken to resolve the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Source Name or ID',
				name: 'source',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketSources',
				},
				default: '',
				description:
					'Channel where ticket was originally submitted. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketStages',
					loadOptionsDependsOn: ['updateFields.pipelineId'],
				},
				default: '',
				description:
					'The stage ID of the pipeline the ticket is in; depends on Pipeline ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket Name',
				name: 'ticketName',
				type: 'string',
				default: '',
				description: 'The ID of the pipeline the ticket is in',
			},
			{
				displayName: 'Ticket Owner Name or ID',
				name: 'ticketOwnerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The user from your team that the ticket is assigned to. You can assign additional users to a ticket record by creating a custom HubSpot user property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  ticket:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular ticket',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include Deleted',
				name: 'includeDeleted',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTicketProperties',
				},
				default: [],
				description:
					'<p>Used to include specific ticket properties in the results. By default, the results will only include ticket ID and will not include the values for any properties for your tickets.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties With History',
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
		displayName: 'Return All',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTicketProperties',
				},
				default: [],
				description:
					'<p>Used to include specific ticket properties in the results. By default, the results will only include ticket ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties With History',
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
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular ticket',
	},
];
