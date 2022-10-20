import { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user',
				action: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update a user',
			},
		],
		default: 'create',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 user:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			'Stores the password for the user account. A minimum of 8 characters is required. The maximum length is 100 characters.',
	},
	{
		displayName: 'Domain Name or ID',
		name: 'domain',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getDomains',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			"The username that will be set to the user. Example: If you domain is example.com and you set the username to jhon then the user's final email address will be jhon@example.com.",
	},
	{
		displayName: 'Make Admin',
		name: 'makeAdmin',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: false,
		description: 'Whether to make a user a super administrator',
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
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Change Password At Next Login',
				name: 'changePasswordAtNextLogin',
				type: 'boolean',
				default: false,
				description: 'Whether the user is forced to change their password at next login',
			},
			{
				displayName: 'Phones',
				name: 'phoneUi',
				placeholder: 'Add Phone',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'phoneValues',
						displayName: 'Phone',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Assistant',
										value: 'assistant',
									},
									{
										name: 'Callback',
										value: 'callback',
									},
									{
										name: 'Car',
										value: 'car',
									},
									{
										name: 'Company Main',
										value: 'company_main',
									},
									{
										name: 'Custom',
										value: 'custom',
									},
									{
										name: 'Grand Central',
										value: 'grand_central',
									},
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'home_fax',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'isdn',
										value: 'isdn',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Other Fax',
										value: 'other_fax',
									},
									{
										name: 'Pager',
										value: 'pager',
									},
									{
										name: 'Radio',
										value: 'radio',
									},
									{
										name: 'Telex',
										value: 'telex',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'tty tdd',
										value: 'tty_tdd',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'work_fax',
									},
									{
										name: 'Work Mobile',
										value: 'work_mobile',
									},
									{
										name: 'Work Pager',
										value: 'work_pager',
									},
								],
								default: 'work',
								description: 'The type of phone number',
							},
							{
								displayName: 'Phone Number',
								name: 'value',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: false,
								description:
									"Whether this is the user's primary phone number. A user may only have one primary phone number.",
							},
						],
					},
				],
			},
			{
				displayName: 'Secondary Emails',
				name: 'emailUi',
				placeholder: 'Add Email',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'emailValues',
						displayName: 'Email',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: 'work',
								description: 'The type of the email account',
							},
							{
								displayName: 'Email',
								name: 'address',
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
	/*                                 user:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			"The value can be the user's primary email address, alias email address, or unique user ID",
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			"The value can be the user's primary email address, alias email address, or unique user ID",
	},
	{
		displayName: 'Projection',
		name: 'projection',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Basic',
				value: 'basic',
				description: 'Do not include any custom fields for the user',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Include custom fields from schemas requested in customField',
			},
			{
				name: 'Full',
				value: 'full',
				description: 'Include all fields associated with this user',
			},
		],
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['user'],
			},
		},
		default: 'basic',
		description: 'What subset of fields to fetch for this user',
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
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Custom Schema Names or IDs',
				name: 'customFieldMask',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'/projection': ['custom'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSchemas',
				},
				default: [],
				description:
					'A comma-separated list of schema names. All fields from these schemas are fetched. This should only be set when projection=custom. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'View Type',
				name: 'viewType',
				type: 'options',
				options: [
					{
						name: 'Admin View',
						value: 'admin_view',
						description:
							'Results include both administrator-only and domain-public fields for the user',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
						description:
							'Results only include fields for the user that are publicly visible to other users in the domain',
					},
				],
				default: 'admin_view',
				description:
					'Whether to fetch the administrator-only or domain-wide public view of the user. For more information, see Retrieve a user as a non-administrator.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
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
				resource: ['user'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Projection',
		name: 'projection',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Basic',
				value: 'basic',
				description: 'Do not include any custom fields for the user',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Include custom fields from schemas requested in customField',
			},
			{
				name: 'Full',
				value: 'full',
				description: 'Include all fields associated with this user',
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		default: 'basic',
		description: 'What subset of fields to fetch for this user',
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
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Custom Schema Names or IDs',
				name: 'customFieldMask',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'/projection': ['custom'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSchemas',
				},
				default: [],
				description:
					'A comma-separated list of schema names. All fields from these schemas are fetched. This should only be set when projection=custom. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'string',
				default: '',
				description:
					"The unique ID for the customer's Google Workspace account. In case of a multi-domain account, to fetch all groups for a customer, fill this field instead of domain.",
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name. Use this field to get fields from only one domain.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Family Name',
						value: 'familyName',
					},
					{
						name: 'Given Name',
						value: 'givenName',
					},
				],
				default: '',
				description: 'Property to use for sorting results',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Free text search terms to find users that match these terms in any field, except for extended properties. For more information on constructing user queries, see <a href="https://developers.google.com/admin-sdk/directory/v1/guides/search-users">Search for Users</a>.',
			},
			{
				displayName: 'Show Deleted',
				name: 'showDeleted',
				type: 'boolean',
				default: false,
				description: 'Whether to retrieve the list of deleted users',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
				description: 'Whether to return results in ascending or descending order',
			},
			{
				displayName: 'View Type',
				name: 'viewType',
				type: 'options',
				options: [
					{
						name: 'Admin View',
						value: 'admin_view',
						description:
							'Results include both administrator-only and domain-public fields for the user',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
						description:
							'Results only include fields for the user that are publicly visible to other users in the domain',
					},
				],
				default: 'admin_view',
				description:
					'Whether to fetch the administrator-only or domain-wide public view of the user. For more information, see Retrieve a user as a non-administrator.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			"The value can be the user's primary email address, alias email address, or unique user ID",
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: 'Whether user is archived',
			},
			{
				displayName: 'Change Password At Next Login',
				name: 'changePasswordAtNextLogin',
				type: 'boolean',
				default: false,
				description: 'Whether the user is forced to change their password at next login',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Stores the password for the user account. A minimum of 8 characters is required. The maximum length is 100 characters.',
			},
			{
				displayName: 'Phones',
				name: 'phoneUi',
				placeholder: 'Add Phone',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'phoneValues',
						displayName: 'Phone',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Assistant',
										value: 'assistant',
									},
									{
										name: 'Callback',
										value: 'callback',
									},
									{
										name: 'Car',
										value: 'car',
									},
									{
										name: 'Company Main',
										value: 'company_main',
									},
									{
										name: 'Custom',
										value: 'custom',
									},
									{
										name: 'Grand Central',
										value: 'grand_central',
									},
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'home_fax',
									},
									{
										name: 'Isdn',
										value: 'isdn',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Other Fax',
										value: 'other_fax',
									},
									{
										name: 'Pager',
										value: 'pager',
									},
									{
										name: 'Radio',
										value: 'radio',
									},
									{
										name: 'Telex',
										value: 'telex',
									},
									{
										name: 'Tty Tdd',
										value: 'tty_tdd',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'work_fax',
									},
									{
										name: 'Work Mobile',
										value: 'work_mobile',
									},
									{
										name: 'Work Pager',
										value: 'work_pager',
									},
								],
								default: 'work',
								description: 'The type of phone number',
							},
							{
								displayName: 'Phone Number',
								name: 'value',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: false,
								description:
									"Whether this is the user's primary phone number. A user may only have one primary phone number.",
							},
						],
					},
				],
			},
			{
				displayName: 'Primary Email',
				name: 'primaryEmail',
				type: 'string',
				default: '',
				description:
					"The user's primary email address. This property is required in a request to create a user account. The primaryEmail must be unique and cannot be an alias of another user.",
			},
			{
				displayName: 'Secondary Emails',
				name: 'emailUi',
				placeholder: 'Add Email',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'emailValues',
						displayName: 'Email',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Other',
										value: 'other',
									},
								],
								default: 'work',
								description: 'The type of the email account',
							},
							{
								displayName: 'Email',
								name: 'address',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
];
