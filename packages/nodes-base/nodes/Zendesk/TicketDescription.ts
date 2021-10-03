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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
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
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
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
					'ticket',
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
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldsValues',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'Custom field ID',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field Value.',
							},
						],
					},
				],
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An id you can use to link Zendesk Support tickets to local records',
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
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
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
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
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
		],
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
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
		description: `Object of values to set as described <a href="https://developer.zendesk.com/rest_api/docs/support/tickets">here</a>.`,
	},

/* -------------------------------------------------------------------------- */
/*                                ticket:update                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
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
					'ticket',
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
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldsValues',
						values: [
							{
								displayName: 'ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'Custom field ID',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field Value.',
							},
						],
					},
				],
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An id you can use to link Zendesk Support tickets to local records',
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
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
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
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
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
		],
	},
	{
		displayName: ' Update Fields',
		name: 'updateFieldsJson',
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
		description: `Object of values to update as described <a href="https://developer.zendesk.com/rest_api/docs/support/tickets">here</a>.`,
	},

/* -------------------------------------------------------------------------- */
/*                                 ticket:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
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
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                ticket:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
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
