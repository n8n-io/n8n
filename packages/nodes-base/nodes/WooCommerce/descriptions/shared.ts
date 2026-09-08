import type { INodeProperties } from 'n8n-workflow';

const customerAddressOptions: INodeProperties[] = [
	{
		displayName: 'First name',
		name: 'first_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Last name',
		name: 'last_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address 1',
		name: 'address_1',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address 2',
		name: 'address_2',
		type: 'string',
		default: '',
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Postcode',
		name: 'postcode',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
];

const customerUpdateOptions: INodeProperties[] = [
	{
		displayName: 'Billing address',
		name: 'billing',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		options: customerAddressOptions,
	},
	{
		displayName: 'First name',
		name: 'first_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Last name',
		name: 'last_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Metadata',
		name: 'meta_data',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add metadata field',
		options: [
			{
				displayName: 'Metadata fields',
				name: 'meta_data_fields',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		displayOptions: {
			show: {
				'/resource': ['customer'],
				'/operation': ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Shipping address',
		name: 'shipping',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		options: customerAddressOptions,
	},
];

const customerCreateOptions: INodeProperties[] = [
	...customerUpdateOptions,
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
	},
];

export const customerCreateFields: INodeProperties = {
	displayName: 'Additional fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add field',
	default: {},
	displayOptions: {
		show: {
			resource: ['customer'],
			operation: ['create'],
		},
	},
	options: customerCreateOptions,
};

export const customerUpdateFields: INodeProperties = {
	displayName: 'Update fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add field',
	default: {},
	displayOptions: {
		show: {
			resource: ['customer'],
			operation: ['update'],
		},
	},
	options: customerUpdateOptions,
};
