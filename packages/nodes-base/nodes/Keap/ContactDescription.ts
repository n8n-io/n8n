import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description:
					'Create a new contact, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many contacts',
				action: 'Get many contacts',
			},
		],
		default: 'upsert',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 contact:upsert                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Duplicate Option',
		name: 'duplicateOption',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Email And Name',
				value: 'emailAndName',
			},
		],
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['contact'],
			},
		},
		default: 'email',
		description:
			'Performs duplicate checking by one of the following options: Email, EmailAndName. If a match is found using the option provided, the existing contact will be updated.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Anniversary',
				name: 'anniversary',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Contact Type Name or ID',
				name: 'contactType',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getContactTypes',
				},
				default: '',
			},
			{
				displayName: 'Family Name',
				name: 'familyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Given Name',
				name: 'givenName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead Source ID',
				name: 'leadSourceId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Middle Name',
				name: 'middleName',
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
				displayName: 'Owner Name or ID',
				name: 'ownerId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Preferred Locale',
				name: 'preferredLocale',
				type: 'string',
				placeholder: 'en',
				default: '',
			},
			{
				displayName: 'Preferred Name',
				name: 'preferredName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Source Type',
				name: 'sourceType',
				type: 'options',
				options: [
					{
						name: 'API',
						value: 'API',
					},
					{
						name: 'Import',
						value: 'IMPORT',
					},
					{
						name: 'Landing Page',
						value: 'LANDINGPAGE',
					},
					{
						name: 'Manual',
						value: 'MANUAL',
					},
					{
						name: 'Other',
						value: 'OTHER',
					},
					{
						name: 'Unknown',
						value: 'UNKNOWN',
					},
				],
				default: '',
			},
			{
				displayName: 'Spouse Name',
				name: 'spouseName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Timezone Name or ID',
				name: 'timezone',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
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
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Address',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'addressesValues',
				displayName: 'Address',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						options: [
							{
								name: 'Billing',
								value: 'BILLING',
							},
							{
								name: 'Shipping',
								value: 'SHIPPING',
							},
							{
								name: 'Other',
								value: 'OTHER',
							},
						],
						default: '',
					},
					{
						displayName: 'Country Code Name or ID',
						name: 'countryCode',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getCountries',
						},
						default: '',
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
		displayName: 'Emails',
		name: 'emailsUi',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Email',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'emailsValues',
				displayName: 'Email',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						options: [
							{
								name: 'Email 1',
								value: 'EMAIL1',
							},
							{
								name: 'Email 2',
								value: 'EMAIL2',
							},
							{
								name: 'Email 3',
								value: 'EMAIL3',
							},
						],
						default: '',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
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
			multipleValues: true,
		},
		placeholder: 'Add Fax',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'faxesValues',
				displayName: 'Fax',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						options: [
							{
								name: 'Fax 1',
								value: 'FAX1',
							},
							{
								name: 'Fax 2',
								value: 'FAX2',
							},
						],
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
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'phonesValues',
				displayName: 'Phones',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						options: [
							{
								name: 'Phone 1',
								value: 'PHONE1',
							},
							{
								name: 'Phone 2',
								value: 'PHONE2',
							},
							{
								name: 'Phone 3',
								value: 'PHONE3',
							},
							{
								name: 'Phone 4',
								value: 'PHONE4',
							},
							{
								name: 'Phone 5',
								value: 'PHONE5',
							},
						],
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
		displayName: 'Social Accounts',
		name: 'socialAccountsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Social Account',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'socialAccountsValues',
				displayName: 'Social Account',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Facebook',
								value: 'Facebook',
							},
							{
								name: 'Twitter',
								value: 'Twitter',
							},
							{
								name: 'LinkedIn',
								value: 'LinkedIn',
							},
						],
						default: '',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description:
					"Comma-delimited list of Contact properties to include in the response. (Some fields such as lead_source_id, custom_fields, and job_title aren't included, by default.).",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
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
				resource: ['contact'],
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
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Given Name',
				name: 'givenName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Family Name',
				name: 'familyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'Email',
						value: 'email',
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
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Date to start searching from on LastUpdated',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'dateTime',
				default: '',
				description: 'Date to search to on LastUpdated',
			},
		],
	},
];
