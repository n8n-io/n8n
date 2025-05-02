import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		noDataExpression: true,
		name: 'operation',
		type: 'options',
		options: [
			{ name: 'Create Contact', value: 'createContact' },
			{ name: 'Update Contact', value: 'updateContact' },
			{ name: 'Get Contact', value: 'getContact' },
			{ name: 'Get All Contacts', value: 'getAllContacts' },
		],
		default: 'createContact',
		description: 'Choose the operation',
	},

	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { operation: ['getContact', 'updateContact'] },
		},
	},

	{
		displayName: 'Contact Name',
		name: 'contactName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { operation: ['createContact'] },
		},
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['createContact', 'updateContact'],
			},
		},
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: '' },
			{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '', placeholder: '' },
			{ displayName: 'GSTIN', name: 'gstin', type: 'string', default: '', placeholder: '' },
			{
				displayName: 'Business Name',
				name: 'business_name',
				type: 'string',
				default: '',
				placeholder: '',
			},
			{
				displayName: 'Billing Address 1',
				name: 'billing_address1',
				type: 'string',
				default: '',
				placeholder: '',
			},
			{
				displayName: 'Billing Address 2',
				name: 'billing_address2',
				type: 'string',
				default: '',
				placeholder: '',
			},
			{ displayName: 'City', name: 'location', type: 'string', default: '', placeholder: '' },
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'TAMIL NADU', value: 'TAMIL NADU' },
					{ name: 'KARNATAKA', value: 'KARNATAKA' },
					{ name: 'KERALA', value: 'KERALA' },
					{ name: 'INTERNATIONAL', value: 'INTERNATIONAL' },
				],
				default: 'TAMIL NADU',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'options',
				options: [
					{ name: 'INDIA', value: 'INDIA' },
					{ name: 'UNITED STATES OF AMERICA', value: 'UNITED STATES OF AMERICA' },
					{ name: 'UNITED KINGDOM', value: 'UNITED KINGDOM' },
				],
				default: 'INDIA',
			},
		],
	},

	{
		displayName: 'Limit (Per Page)',
		name: 'perPage',
		type: 'number',
		default: 5,
		displayOptions: {
			show: { operation: ['getAllContacts'] },
		},
	},
];
