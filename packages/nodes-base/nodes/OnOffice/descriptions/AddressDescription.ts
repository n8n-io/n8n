import { INodeProperties } from 'n8n-workflow';
import { commonReadDescription } from './CommonReadDescription';

export const addressOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['address'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an address',
			},
			{
				name: 'Read',
				value: 'read',
				description: 'Read an address',
			},
			{
				name: 'Edit',
				value: 'edit',
				description: 'Edit an address',
			},
		],
		default: 'read',
		description: 'The operation to perform.',
	},
];

export const addressFields: INodeProperties[] = [
	{
		displayName: 'Data fields',
		name: 'data',
		type: 'string',
		required: true,
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['address'],
				operation: ['read'],
			},
		},
		description: 'The data fields to fetch',
	},
	{
		displayName: 'Special data fields',
		name: 'specialData',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['address'],
				operation: ['read'],
			},
		},
		options: [
			{
				name: 'phone',
				value: 'phone',
				description: 'All phonebook entries except with type “mobile”',
			},
			{
				name: 'mobile',
				value: 'mobile',
				description: 'All phone book entries with type “mobile”',
			},
			{
				name: 'fax',
				value: 'fax',
				description: 'All phone book entries with type “fax”',
			},
			{
				name: 'email',
				value: 'email',
				description: 'All phone book entries with type “email”',
			},
			{
				name: 'defaultphone',
				value: 'defaultphone',
				description: 'Like phone, but only returns the record marked as default',
			},
			{
				name: 'defaultfax',
				value: 'defaultfax',
				description: 'Like fax, but only returns the record marked as default',
			},
			{
				name: 'defaultemail',
				value: 'defaultemail',
				description: 'Like email, but only returns the record marked as default',
			},
			{
				name: 'imageUrl',
				value: 'imageUrl',
				description: 'Image URL (pass photo) of the address',
			},
		],
		default: [],
		description: 'Some data fields have special meaning. Select the fields you want to include.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['address'],
				operation: ['read'],
			},
		},
		options: [
			{
				displayName: 'Record IDs',
				name: 'recordIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'Can be used if one or more than one record should be read, but not all',
			},
			{
				displayName: 'Filter ID',
				name: 'filterId',
				type: 'number',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				default: 0,
				description: 'Restrict the selection of address data records by a existing filter',
			},
			...commonReadDescription,
			{
				//TODO: Figure out what this does
				displayName: 'Format output',
				name: 'formatOutput',
				type: 'boolean',
				default: false,
				description: 'Enable formatted output',
			},
			{
				//TODO: Figure out what this does
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Output language',
			},
			{
				displayName: 'Country format',
				name: 'countryIsoCodeType',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: '',
					},
					{
						name: 'ISO-3166-2',
						value: 'ISO-3166-2',
					},
					{
						name: 'ISO-3166-3',
						value: 'ISO-3166-3',
					},
				],
				default: '',
				description:
					'Causes the field "Land" to be displayed as a ISO-3166-2 or ISO-3166-3 country code',
			},
		],
	},
];
