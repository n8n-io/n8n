import {
	CustomerProperties,
} from '../../Interfaces';

export const customerAddCustomerDescription: CustomerProperties = [
	{
		displayName: 'First Name',
		name: 'firstname',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'addCustomer',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastname',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'addCustomer',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Business Name',
		name: 'business_name',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'addCustomer',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'addCustomer',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'addCustomer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Address',
				name: 'address',
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
				displayName: 'ZIP',
				name: 'zip',
				type: 'string',
				default: '',
			},
		],
	},
];
