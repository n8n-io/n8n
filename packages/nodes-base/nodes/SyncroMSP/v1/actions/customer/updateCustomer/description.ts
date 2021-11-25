import {
	CustomerProperties,
} from '../../Interfaces';

export const customerUpdateCustomerDescription: CustomerProperties = [
	{
		displayName: 'Customer Id',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'updateCustomer',
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
					'updateCustomer',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Business Name',
				name: 'business_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
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
			{
				displayName: 'Notes',
				name: 'notes',
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
				displayName: 'No Email',
				name: 'no_email',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Referred By',
				name: 'referred_by',
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
				displayName: 'Invoice Email',
				name: 'invoice_cc_email',
				type: 'string',
				default: '',
			},
		],
	},
];
