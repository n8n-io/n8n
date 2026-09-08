import { addressFixedCollection } from '../../../methods/sharedFields';
import type { CustomerProperties } from '../../Interfaces';

export const customerUpdateDescription: CustomerProperties = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			addressFixedCollection,
			{
				displayName: 'Business name',
				name: 'businessName',
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
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Get SMS',
				name: 'getSms',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Invoice emails',
				name: 'invoiceCcEmails',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Email',
				},
				default: '',
			},
			{
				displayName: 'Last name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'No email',
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
				displayName: 'Notification email',
				name: 'notificationEmail',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						noEmail: [false],
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
				displayName: 'Referred by',
				name: 'referredBy',
				type: 'string',
				default: '',
				description:
					'Source from which customer is referred to the platform like Linkedin, Google, Customer name etc',
			},
		],
	},
];
