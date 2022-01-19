import {
	INodeProperties
} from 'n8n-workflow';

export const adminOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'admins' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Onfleet admin',
			},
			{
				name: 'Remove',
				value: 'delete',
				description: 'Remove an Onfleet admin',
			},
			{
				name: 'List',
				value: 'getAll',
				description: 'List all Onfleet admins',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Onfleet admin',
			},
		],
		default: 'getAll',
	},
] as INodeProperties[];

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
	displayName: 'Read only',
	name: 'isReadOnly',
	type: 'boolean',
	default: false,
	description: 'Whether this administrator can perform write operations',
} as INodeProperties;

export const adminFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'admins' ],
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
		displayOptions: {
			show: {
				resource: [ 'admins' ],
				operation: [ 'create' ],
			},
		},
		required: true,
		...adminNameField,
	},
	{
		displayOptions: {
			show: {
				resource: [ 'admins' ],
				operation: [ 'create' ],
			},
		},
		required: true,
		...adminEmailField,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'admins' ],
				operation: [ 'create' ],
			},
		},
		options: [
			adminPhoneField,
			adminReadOnlyField,
		],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'admins' ],
				operation: [ 'update' ],
			},
		},
		options: [
			adminNameField,
			adminPhoneField,
			adminReadOnlyField,
		],
	},
] as INodeProperties[];
