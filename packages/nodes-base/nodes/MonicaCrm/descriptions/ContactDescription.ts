import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------------
	//             contact: create
	// ----------------------------------------
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Gender Name or ID',
		name: 'genderId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getGenders',
		},
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Birthdate',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Deceased Date',
				name: 'deceasedDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Is Deceased',
				name: 'isDeceased',
				description: 'Whether the contact has passed away',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'is_partial',
				type: 'options',
				default: false,
				options: [
					{
						name: 'Real',
						value: false,
						description: 'Contact with their own contact sheet',
					},
					{
						name: 'Partial',
						value: true,
						description: 'Contact without their own contact sheet',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             contact: delete
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               contact: get
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             contact: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Search Term',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Search term to filter results by',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{
						name: 'Ascended Created At',
						value: 'created_at',
					},
					{
						name: 'Descended Created At',
						value: '-created_at',
					},
					{
						name: 'Ascended Updated At',
						value: 'updated_at',
					},
					{
						name: 'Descended Updated At',
						value: '-updated_at',
					},
				],
				default: '',
			},
		],
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------------
	//             contact: update
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Birthdate',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Deceased Date',
				name: 'deceased_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Gender Name or ID',
				name: 'gender_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getGenders',
				},
			},
			{
				displayName: 'Is Deceased',
				name: 'is_deceased',
				description: 'Whether the contact has passed away',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'is_partial',
				type: 'options',
				default: false,
				options: [
					{
						name: 'Real',
						value: false,
						description: 'Contact with their own contact sheet',
					},
					{
						name: 'Partial',
						value: true,
						description: 'Contact without their own contact sheet',
					},
				],
			},
		],
	},
];
