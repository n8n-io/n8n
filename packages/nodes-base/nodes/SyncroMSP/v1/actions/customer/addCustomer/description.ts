import {
	CustomerProperties,
} from '../../Interfaces';

export const customerAddCustomerDescription: CustomerProperties = [
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
				displayName: 'Get SMS',
				name: 'get_sms',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Invoice Email',
				name: 'invoice_cc_email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'No Email',
				name: 'no_email',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notification Email',
				name: 'notification_email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Referred By',
				name: 'referred_by',
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
