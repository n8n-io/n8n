import {
	CustomerProperties,
} from '../../Interfaces';

import {
	addressFixedCollection
} from '../../../methods/sharedFields';

export const customerAddDescription: CustomerProperties = [
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
					'add',
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
					'add',
				],
			},
		},
		default: {},
		options: [
			addressFixedCollection,
			{
				displayName: 'Business Name',
				name: 'businessName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Get SMS',
				name: 'getSms',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Invoice Emails',
				name: 'invoiceCcEmails',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'No Email',
				name: 'noEmail',
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
				name: 'notificationEmail',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						noEmail: [
							false,
						],
					},
				},
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Referred By',
				name: 'referredBy',
				type: 'string',
				default: '',
				description: 'Source from which customer is referred to the platform like Linkedin, Google, Customer name etc.',
			},
		],
	},
];
