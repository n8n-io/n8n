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
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const contactFields = [
	// ----------------------------------------
	//             contact: create
	// ----------------------------------------
	{
		displayName: 'Email',
		name: 'email',
		description: 'Email of the contact to create.',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
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
				displayName: 'Address',
				name: 'address1',
				type: 'string',
				default: '',
				description: 'Address of the contact to create.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City of the contact to create.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact to create.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact to create.',
			},
			{
				displayName: 'Full Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Full name of the contact to create.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone of the contact to create.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'Postal code of the contact to create.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State of the contact to create.',
			},
		],
	},

	// ----------------------------------------
	//             contact: delete
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to delete.',
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
		description: 'ID of the contact to retrieve.',
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
	//             contact: update
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to update.',
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
				displayName: 'Address',
				name: 'address1',
				type: 'string',
				default: '',
				description: 'Address to set for the contact.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City to set for the contact.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email to set for the contact.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name to set for the contact.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name to set for the contact.',
			},
			{
				displayName: 'Full Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Full name to set for the contact.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number to set for the contact.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'Postal code to set for the contact.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State to set for the contact.',
			},
		],
	},
] as INodeProperties[];
