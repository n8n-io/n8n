import {
	INodeProperties,
} from 'n8n-workflow';

export const journalEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a journal entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a journal entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a journal entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all journal entries',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a journal entry',
			},
		],
		default: 'create',
	},
];

export const journalEntryFields: INodeProperties[] = [
	// ----------------------------------------
	//           journalEntry: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the journal entry - max 250 characters',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'post',
		description: 'Content of the journal entry - max 100,000 characters',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//           journalEntry: delete
	// ----------------------------------------
	{
		displayName: 'Journal Entry ID',
		name: 'journalId',
		description: 'ID of the journal entry to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//            journalEntry: get
	// ----------------------------------------
	{
		displayName: 'Journal Entry ID',
		name: 'journalId',
		description: 'ID of the journal entry to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//           journalEntry: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------------
	//           journalEntry: update
	// ----------------------------------------
	{
		displayName: 'Journal Entry ID',
		name: 'journalId',
		description: 'ID of the journal entry to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'journalEntry',
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
					'journalEntry',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'post',
				description: 'Content of the journal entry - max 100,000 characters',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				description: 'Title of the journal entry - max 250 characters',
				type: 'string',
				default: '',
			},
		],
	},
];
