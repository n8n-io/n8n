import {
	INodeProperties
} from 'n8n-workflow';

export const adminOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'admin',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet admin',
				action: 'Create an admin',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an Onfleet admin',
				action: 'Delete an admin',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all Onfleet admins',
				action: 'Get all admins',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet admin',
				action: 'Update an admin',
			},
		],
		default: 'getAll',
	},
];

const adminNameField = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	default: '',
	description: 'The administrator\'s name',
} as INodeProperties;

const adminEmailField = {
	displayName: 'Email',
	name: 'email',
	type: 'string',
	placeholder: 'name@email.com',
	default: '',
	description: 'The administrator\'s email address',
} as INodeProperties;

const adminPhoneField = {
	displayName: 'Phone',
	name: 'phone',
	type: 'string',
	default: '',
	description: 'The administrator\'s phone number',
} as INodeProperties;

const adminReadOnlyField = {
	displayName: 'Read Only',
	name: 'isReadOnly',
	type: 'boolean',
	default: false,
	description: 'Whether this administrator can perform write operations',
} as INodeProperties;

export const adminFields: INodeProperties[] = [
	{
		displayName: 'Admin ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'admin',
				],
			},
			hide: {
				operation: [
					'create',
					'getAll',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the admin object for lookup',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'admin',
				],
				operation: [
					'getAll',
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
				resource: [
					'admin',
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
			maxValue: 64,
		},
		default: 64,
		description: 'Max number of results to return',
	},
	{
		displayOptions: {
			show: {
				resource: [
					'admin',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		...adminNameField,
	},
	{
		displayOptions: {
			show: {
				resource: [
					'admin',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		...adminEmailField,
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
					'admin',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			adminPhoneField,
			adminReadOnlyField,
		],
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
					'admin',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			adminNameField,
			adminPhoneField,
			adminReadOnlyField,
		],
	},
];
