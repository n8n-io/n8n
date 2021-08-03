import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const contactFields = [
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
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Gender',
		name: 'genderId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getGenders',
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
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
					'contact',
				],
				operation: [
					'create',
				],
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
				displayName: 'Birthdate Age',
				name: 'birthdate_age',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Number of years between the birthdate and the current year',
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
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
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
				resource: [
					'contact',
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
					'contact',
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
		],
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
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
					'contact',
				],
				operation: [
					'update',
				],
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
				displayName: 'Birthdate Age',
				name: 'birthdate_age',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Number of years between the birthdate and the current year',
			},
			{
				displayName: 'Deceased Date',
				name: 'deceasedDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Gender',
				name: 'genderId',
				type: 'options',
				required: true,
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getGenders',
				},
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
] as INodeProperties[];
