import {
	INodeProperties,
} from 'n8n-workflow';

export const contactAddressOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a new contact address',
			},
		],
		default: 'create',
	},
];

export const contactAddressFields: INodeProperties[] = [
	{
		displayName: 'Contact',
		name: 'contact',
		description: 'The contact to which this contact address belongs',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "Contact"',
				type: 'string',
				default: 'Contact',
			},
		],
	},
	{
		displayName: 'Country',
		name: 'country',
		description: 'Country of the contact address. For all countries, send a GET to /StaticCountry.',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the contact',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "StaticCountry"',
				type: 'string',
				default: 'StaticCountry',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				description: 'Category of the contact address. For all categories, send a GET to /Category?objectType=ContactAddress.',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the category',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Category"',
						type: 'string',
						default: 'Category',
					},
				],
			},
			{
				displayName: 'City',
				name: 'city',
				description: 'City Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				description: 'Name in address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Second Name',
				name: 'name2',
				description: 'Second Name in address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Third Name',
				name: 'name3',
				description: 'Third Name in address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fourth Name',
				name: 'name4',
				description: 'Fourth Name in address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Street',
				name: 'street',
				description: 'Street name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
			},
		],
	},
];
