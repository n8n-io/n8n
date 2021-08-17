import {
	INodeProperties,
} from 'n8n-workflow';

export const softwareOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'software',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a software',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a software',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a software',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all softwares',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a software',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const softwareFields = [
	// ----------------------------------------
	//             software: create
	// ----------------------------------------
	{
		displayName: 'Application Type',
		name: 'application_type',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Desktop',
				value: 'desktop',
			},
			{
				name: 'Mobile',
				value: 'mobile',
			},
			{
				name: 'SaaS',
				value: 'saas',
			},
		],
		default: 'desktop',
		displayOptions: {
			show: {
				resource: [
					'software',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the software',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'software',
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
					'software',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'Category of the software',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the software',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the software',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'managed',
				options: [
					{
						name: 'Blacklisted',
						value: 'blacklisted',
					},
					{
						name: 'Ignored',
						value: 'ignored',
					},
					{
						name: 'Managed',
						value: 'managed',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             software: delete
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'software',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              software: get
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'software',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             software: getAll
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
					'software',
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
					'software',
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
	//             software: update
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'software',
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
					'software',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Application Type',
				name: 'application_type',
				type: 'options',
				default: 'desktop',
				description: 'Type of the software',
				options: [
					{
						name: 'Desktop',
						value: 'desktop',
					},
					{
						name: 'Mobile',
						value: 'mobile',
					},
					{
						name: 'SaaS',
						value: 'saas',
					},
				],
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'Category of the software',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the software',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the software',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Notes about the software',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'managed',
				options: [
					{
						name: 'Blacklisted',
						value: 'blacklisted',
					},
					{
						name: 'Ignored',
						value: 'ignored',
					},
					{
						name: 'Managed',
						value: 'managed',
					},
				],
			},
		],
	},
] as INodeProperties[];
