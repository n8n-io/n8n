import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a company',
				action: 'Create a company',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many companies',
				action: 'Get many companies',
			},
		],
		default: 'create',
	},
];

export const companyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 company:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company Name',
		name: 'companyName',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['company'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['company'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'emailAddress',
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
				displayName: 'Opt In Reason',
				name: 'optInReason',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Addresses',
		name: 'addressesUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		default: {},
		placeholder: 'Add Address',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'addressesValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'Country Code',
						name: 'countryCode',
						type: 'string',
						default: '',
						description: 'ISO Alpha-3 Code',
					},
					{
						displayName: 'Line 1',
						name: 'line1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Line 2',
						name: 'line2',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Locality',
						name: 'locality',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Region',
						name: 'region',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'zipCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Four',
						name: 'zipFour',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Faxes',
		name: 'faxesUi',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: false,
		},
		placeholder: 'Add Fax',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'faxesValues',
				displayName: 'Fax',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Number',
						name: 'number',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Phones',
		name: 'phonesUi',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Phone',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'phonesValues',
				displayName: 'Phones',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Number',
						name: 'number',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 company:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['company'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['company'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['company'],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'Company name to query on',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Date Created',
						value: 'datecreated',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Name',
						value: 'name',
					},
				],
				default: '',
				description: 'Attribute to order items by',
			},
			{
				displayName: 'Order Direction',
				name: 'orderDirection',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ascending',
					},
					{
						name: 'DES',
						value: 'descending',
					},
				],
				default: '',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description:
					"Comma-delimited list of Company properties to include in the response. (Fields such as notes, fax_number and custom_fields aren't included, by default.).",
			},
		],
	},
];
