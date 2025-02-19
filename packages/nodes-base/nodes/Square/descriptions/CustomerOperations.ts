import type { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a customer',
				action: 'Create a customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a customer',
				action: 'Delete a customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer',
				action: 'Get a customer',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many customers',
				action: 'Get many customers',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search customers',
				action: 'Search customers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a customer',
				action: 'Update a customer',
			},
		],
		displayOptions: {
			show: {
				resource: ['customer'],
			},
		},
	},
];

export const customerFields: INodeProperties[] = [
	// ----------------------------------
	//         customer:create
	// ----------------------------------
	{
		displayName: 'Given Name',
		name: 'given_name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
		description: 'Given name (first name) of the customer',
		placeholder: 'John',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address Details',
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Address Line 1',
								name: 'address_line_1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address_line_2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Locality (City)',
								name: 'locality',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Administrative District (State)',
								name: 'administrative_district_level_1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								description: 'Two-letter country code (ISO 3166-1 alpha-2)',
							},
						],
					},
				],
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'string',
				default: '',
				description: 'Birthday in YYYY-MM-DD or MM-DD format',
			},
			{
				displayName: 'Company Name',
				name: 'company_name',
				type: 'string',
				default: '',
				description: 'Company name of the customer',
			},
			{
				displayName: 'Email Address',
				name: 'email_address',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Family Name',
				name: 'family_name',
				type: 'string',
				default: '',
				description: 'Family name (last name) of the customer',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'Note about the customer',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reference ID',
				name: 'reference_id',
				type: 'string',
				default: '',
				description: 'Reference ID for the customer',
			},
		],
	},

	// ----------------------------------
	//         customer:get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['get', 'delete', 'update'],
			},
		},
		description: 'ID of the customer',
	},

	// ----------------------------------
	//         customer:update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address Details',
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Address Line 1',
								name: 'address_line_1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Address Line 2',
								name: 'address_line_2',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Locality (City)',
								name: 'locality',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Administrative District (State)',
								name: 'administrative_district_level_1',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Postal Code',
								name: 'postal_code',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								description: 'Two-letter country code (ISO 3166-1 alpha-2)',
							},
						],
					},
				],
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'string',
				default: '',
				description: 'Birthday in YYYY-MM-DD or MM-DD format',
			},
			{
				displayName: 'Company Name',
				name: 'company_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email Address',
				name: 'email_address',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Family Name',
				name: 'family_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Given Name',
				name: 'given_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nickname',
				name: 'nickname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reference ID',
				name: 'reference_id',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------
	//         customer:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
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
				resource: ['customer'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	// ----------------------------------
	//         customer:search
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['search'],
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
				resource: ['customer'],
				operation: ['search'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Email Address',
				name: 'email_address',
				type: 'string',
				default: '',
				description: 'Email address to search for',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
				description: 'Phone number to search for',
			},
			{
				displayName: 'Reference ID',
				name: 'reference_id',
				type: 'string',
				default: '',
				description: 'Reference ID to search for',
			},
		],
	},
];
