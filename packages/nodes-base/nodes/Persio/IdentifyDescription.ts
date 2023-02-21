import type { INodeProperties } from 'n8n-workflow';

export const identifyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['identify'],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'create',
				description: 'Create or update an identity',
				action: 'Create or update an identity',
			},
		],
		default: 'create',
	},
];

export const identifyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                identify:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'External ID',
		name: 'external_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Anonymous ID',
		name: 'anonymous_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		placeholder: 'John',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		placeholder: 'Doe',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		placeholder: '+1 555 555 5555',
		default: '',
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Address',
		name: 'address',
		placeholder: 'Add address',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'addressUi',
				displayName: 'Address',
				values: [
					{
						displayName: 'Street',
						name: 'street',
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
						displayName: 'Postal Code',
						name: 'postal_code',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Context',
		name: 'context',
		placeholder: 'Add context',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['identify'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'contextUi',
				displayName: 'Context',
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
];
