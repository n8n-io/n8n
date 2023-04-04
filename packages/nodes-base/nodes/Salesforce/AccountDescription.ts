import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Add Note',
				value: 'addNote',
				description: 'Add note to an account',
				action: 'Add a note to an account',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an account',
				action: 'Create an account',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description:
					'Create a new account, or update the current one if it already exists (upsert)',
				action: 'Create or update an account',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an account',
				action: 'Delete an account',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an account',
				action: 'Get an account',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many accounts',
				action: 'Get many accounts',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: "Returns an overview of account's metadata",
				action: 'Get an account summary',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an account',
				action: 'Update an account',
			},
		],
		default: 'create',
	},
];

export const accountFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                account:create                              */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Match Against',
		name: 'externalId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getExternalIdFields',
			loadOptionsDependsOn: ['resource'],
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['upsert'],
			},
		},
		description:
			'The field to check to see if the account already exists. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Value to Match',
		name: 'externalIdValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['upsert'],
			},
		},
		description:
			"If this value exists in the 'match against' field, update the account. Otherwise create a new one.",
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create', 'upsert'],
			},
		},
		description: 'Name of the account. Maximum size is 255 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['create', 'upsert'],
			},
		},
		options: [
			{
				displayName: 'Account Number',
				name: 'accountNumber',
				type: 'string',
				default: '',
				description:
					'Account number assigned to this account (not the unique ID). Maximum size is 40 characters.',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: '',
				description: 'Estimated annual revenue of the account',
			},
			{
				displayName: 'Account Source Name or ID',
				name: 'accountSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAccountSources',
				},
				default: '',
				description:
					'The source of the account record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Billing City',
				name: 'billingCity',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 40 characters.',
			},
			{
				displayName: 'Billing Country',
				name: 'billingCountry',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 80 characters.',
			},
			{
				displayName: 'Billing Postal Code',
				name: 'billingPostalCode',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 20 characters.',
			},
			{
				displayName: 'Billing State',
				name: 'billingState',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 80 characters.',
			},
			{
				displayName: 'Billing Street',
				name: 'billingStreet',
				type: 'string',
				default: '',
				description: 'Street address for the billing address of this account',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Text description of the account. Limited to 32,000 KB.',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the account',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description: 'References the ID of a company in Data.com',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The website of this account. Maximum of 255 characters.',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'The owner of the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'ID of the parent object, if any',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the account',
			},
			{
				displayName: 'Record Type Name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
				},
				default: '',
			},
			{
				displayName: 'SicDesc',
				name: 'sicDesc',
				type: 'string',
				default: '',
				description:
					'A brief description of an organization’s line of business, based on its SIC code',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccountTypes',
				},
				description:
					'Type of account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Shipping City',
				name: 'shippingCity',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. City maximum size is 40 characters.',
			},
			{
				displayName: 'Shipping Country',
				name: 'shippingCountry',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. Country maximum size is 80 characters.',
			},
			{
				displayName: 'Shipping Postal Code',
				name: 'shippingPostalCode',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. Postal code maximum size is 20 characters.',
			},
			{
				displayName: 'Shipping State',
				name: 'shippingState',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. State maximum size is 80 characters.',
			},
			{
				displayName: 'Shipping Street',
				name: 'shippingStreet',
				type: 'string',
				default: '',
				description:
					'The street address of the shipping address for this account. Maximum of 255 characters.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'The website of this account. Maximum of 255 characters.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 account:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['update'],
			},
		},
		description: 'ID of account that needs to be fetched',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Account Number',
				name: 'accountNumber',
				type: 'string',
				default: '',
				description:
					'Account number assigned to this account (not the unique ID). Maximum size is 40 characters.',
			},
			{
				displayName: 'Account Source Name or ID',
				name: 'accountSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAccountSources',
				},
				default: '',
				description:
					'The source of the account record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					numberPrecision: 2,
				},
				default: '',
				description: 'Estimated annual revenue of the account',
			},
			{
				displayName: 'Billing City',
				name: 'billingCity',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 40 characters.',
			},
			{
				displayName: 'Billing Country',
				name: 'billingCountry',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 80 characters.',
			},
			{
				displayName: 'Billing Postal Code',
				name: 'billingPostalCode',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 20 characters.',
			},
			{
				displayName: 'Billing State',
				name: 'billingState',
				type: 'string',
				default: '',
				description:
					'Details for the billing address of this account. Maximum size is 80 characters.',
			},
			{
				displayName: 'Billing Street',
				name: 'billingStreet',
				type: 'string',
				default: '',
				description: 'Street address for the billing address of this account',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Text description of the account. Limited to 32,000 KB.',
			},
			{
				displayName: 'Fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'Fax number for the account',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The website of this account. Maximum of 255 characters.',
			},
			{
				displayName: 'Jigsaw',
				name: 'jigsaw',
				type: 'string',
				default: '',
				description: 'References the ID of a company in Data.com',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the account. Maximum size is 255 characters.',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'ownerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'The owner of the account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'ID of the parent object, if any',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number for the account',
			},
			{
				displayName: 'Record Type Name or ID',
				name: 'recordTypeId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecordTypes',
				},
				default: '',
			},
			{
				displayName: 'SicDesc',
				name: 'sicDesc',
				type: 'string',
				default: '',
				description:
					'A brief description of an organization’s line of business, based on its SIC code',
			},
			{
				displayName: 'Shipping City',
				name: 'shippingCity',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. City maximum size is 40 characters.',
			},
			{
				displayName: 'Shipping Country',
				name: 'shippingCountry',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. Country maximum size is 80 characters.',
			},
			{
				displayName: 'Shipping Postal Code',
				name: 'shippingPostalCode',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. Postal code maximum size is 20 characters.',
			},
			{
				displayName: 'Shipping State',
				name: 'shippingState',
				type: 'string',
				default: '',
				description:
					'Details of the shipping address for this account. State maximum size is 80 characters.',
			},
			{
				displayName: 'Shipping Street',
				name: 'shippingStreet',
				type: 'string',
				default: '',
				description:
					'The street address of the shipping address for this account. Maximum of 255 characters.',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAccountTypes',
				},
				description:
					'Type of account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'The website of this account. Maximum of 255 characters.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  account:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['get'],
			},
		},
		description: 'ID of account that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  account:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['delete'],
			},
		},
		description: 'ID of account that needs to be fetched',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 account:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['account'],
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
				resource: ['account'],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
			{
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The condition to set',
				default: {},
				options: [
					{
						name: 'conditionValues',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAccountFields',
								},
								default: '',
								description:
									'For date, number, or boolean, please use expressions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								noDataExpression: true,
								options: [
									{
										name: '<',
										value: '<',
									},
									{
										name: '<=',
										value: '<=',
									},
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '>=',
										value: '>=',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                             account:addNote                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['addNote'],
			},
		},
		description: 'ID of account that needs to be fetched',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['addNote'],
			},
		},
		description: 'Title of the note',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['addNote'],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				description: 'Body of the note. Limited to 32 KB.',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description:
					'Whether true, only the note owner or a user with the “Modify All Data” permission can view the note or query it via the API',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'ownerId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the user who owns the note. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
