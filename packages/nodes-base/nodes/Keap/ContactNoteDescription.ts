import {
	INodeProperties,
 } from 'n8n-workflow';

export const contactNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contactNote',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a note',
				action: 'Create a contact note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a note',
				action: 'Delete a contact note',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a notes',
				action: 'Get a contact note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all notes',
				action: 'Get all contact notes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a note',
				action: 'Update a contact note',
			},
		],
		default: 'create',
	},
];

export const contactNoteFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 contactNote:create                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contactNote',
				],
			},
		},
		default: '',
		description: 'The infusionsoft user to create the note on behalf of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contactNote',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contactNote',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Appointment',
						value: 'appointment',
					},
					{
						name: 'Call',
						value: 'call',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Fax',
						value: 'fax',
					},
					{
						name: 'Letter',
						value: 'letter',
					},
					{
						name: 'Other',
						value: 'other',
					},
				],
				default: '',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 contactNote:delete                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contactNote',
				],
			},
		},
		default: '',
	},
/* -------------------------------------------------------------------------- */
/*                                 contactNote:get                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contactNote',
				],
			},
		},
		default: '',
	},
/* -------------------------------------------------------------------------- */
/*                                 contactNote:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactNote',
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
				operation: [
					'getAll',
				],
				resource: [
					'contactNote',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
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
				operation: [
					'getAll',
				],
				resource: [
					'contactNote',
				],
			},
		},
		options: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 contactNote:update                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contactNote',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contactNote',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Appointment',
						value: 'appointment',
					},
					{
						name: 'Call',
						value: 'call',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Fax',
						value: 'fax',
					},
					{
						name: 'Letter',
						value: 'letter',
					},
					{
						name: 'Other',
						value: 'other',
					},
				],
				default: '',
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The infusionsoft user to create the note on behalf of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
