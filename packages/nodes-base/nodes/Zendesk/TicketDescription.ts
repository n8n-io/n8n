import {
	INodeProperties,
 } from 'n8n-workflow';

export const ticketOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tickets',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const ticketFields = [

/* -------------------------------------------------------------------------- */
/*                                ticket:create                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The first comment on the ticket',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'ticket'
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An id you can use to link Zendesk Support tickets to local records',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: '',
				description: 'The group this ticket is assigned to',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The array of tags applied to this ticket',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Question',
						value: 'question',
					},
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: '',
				description: 'The type of this ticket',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: '',
				description: 'The state of the ticket',
			}
		],
	},
	{
		displayName: ' Custom Fields',
		name: 'customFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		required: true,
		description: `Array of customs fields <a href="https://developer.zendesk.com/rest_api/docs/support/tickets#setting-custom-field-values" target="_blank">Details</a>`,
	},
/* -------------------------------------------------------------------------- */
/*                                ticket:update                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Ticket ID',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'ticket'
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An id you can use to link Zendesk Support tickets to local records',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: '',
				description: 'The group this ticket is assigned to',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The array of tags applied to this ticket',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Question',
						value: 'question',
					},
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: '',
				description: 'The type of this ticket',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: '',
				description: 'The state of the ticket',
			}
		],
	},
	{
		displayName: ' Custom Fields',
		name: 'customFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		required: true,
		description: `Array of customs fields <a href='https://developer.zendesk.com/rest_api/docs/support/tickets#setting-custom-field-values'>Details</a>`,
	},
/* -------------------------------------------------------------------------- */
/*                                 ticket:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Ticket ID',
	},
/* -------------------------------------------------------------------------- */
/*                                   ticket:getAll                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
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
		default: 100,
		description: 'How many results to return.',
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
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
				],
				default: '',
				description: 'The state of the ticket',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Updated At',
						value: 'updated_at',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Priority',
						value: 'priority',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Ticket Type',
						value: 'ticket_type',
					},
				],
				default: 'updated_at',
				description: 'Defaults to sorting by relevance',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Asc',
						value: 'asc',
					},
					{
						name: 'Desc',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Sort order',
			}
		],
	},

/* -------------------------------------------------------------------------- */
/*                                ticket:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Ticket ID',
	},
] as INodeProperties[];
