import { INodeProperties } from 'n8n-workflow';

export const noteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['note'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a note',
				action: 'Create a note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a note',
				action: 'Delete a note',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a note',
				action: 'Get a note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all notes',
				action: 'Get all notes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a note',
				action: 'Update a note',
			},
		],
		default: 'create',
	},
];

export const noteFields: INodeProperties[] = [
	// ----------------------------------------
	//               note: create
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to associate the note with',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		description: 'Body of the note - max 100,000 characters',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['create'],
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
				resource: ['note'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Is Favorited',
				name: 'isFavorited',
				description: 'Whether the note has been favorited',
				type: 'boolean',
				default: false,
			},
		],
	},

	// ----------------------------------------
	//               note: delete
	// ----------------------------------------
	{
		displayName: 'Note ID',
		name: 'noteId',
		description: 'ID of the note to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                note: get
	// ----------------------------------------
	{
		displayName: 'Note ID',
		name: 'noteId',
		description: 'ID of the note to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//               note: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//               note: update
	// ----------------------------------------
	{
		displayName: 'Note ID',
		name: 'noteId',
		description: 'ID of the note to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['note'],
				operation: ['update'],
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
				resource: ['note'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				description: 'Body of the note - max 100,000 characters',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				description: 'ID of the contact to associate the note with',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Favorited',
				name: 'is_favorited',
				description: 'Whether the note has been favorited',
				type: 'boolean',
				default: false,
			},
		],
	},
];
