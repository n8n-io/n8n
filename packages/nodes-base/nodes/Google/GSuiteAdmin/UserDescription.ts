import type { INodeProperties } from 'n8n-workflow';

const rolesOptions = [
	{
		name: 'Directory Sync Admin',
		value: 'directorySyncAdmin',
		description: 'Whether to assign the Directory Sync Admin role',
	},
	{
		name: 'Groups Admin',
		value: 'groupsAdmin',
		description: 'Whether to assign the Groups Admin role',
	},
	{
		name: 'Groups Editor',
		value: 'groupsEditor',
		description: 'Whether to assign the Groups Editor role',
	},
	{
		name: 'Groups Reader',
		value: 'groupsReader',
		description: 'Whether to assign the Groups Reader role',
	},
	{
		name: 'Help Desk Admin',
		value: 'helpDeskAdmin',
		description: 'Whether to assign the Help Desk Admin role',
	},
	{
		name: 'Inventory Reporting Admin',
		value: 'inventoryReportingAdmin',
		description: 'Whether to assign the Inventory Reporting Admin role',
	},
	{
		name: 'Mobile Admin',
		value: 'mobileAdmin',
		description: 'Whether to assign the Mobile Admin role',
	},
	{
		name: 'Services Admin',
		value: 'servicesAdmin',
		description: 'Whether to assign the Services Admin role',
	},
	{
		name: 'Storage Admin',
		value: 'storageAdmin',
		description: 'Whether to assign the Storage Admin role',
	},
	{
		name: 'Super Admin',
		value: 'superAdmin',
		description: 'Whether to assign the Super Admin role',
	},
	{
		name: 'User Management',
		value: 'userManagement',
		description: 'Whether to assign the User Management role',
	},
];

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
				name: 'Add to Group',
				value: 'addToGroup',
				description: 'Add an existing user to a group',
				action: 'Add user to group',
			},
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
				name: 'Remove From Group',
				value: 'removeFromGroup',
				description: 'Remove a user from a group',
				action: 'Remove user from group',
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
	/*                                 user                                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User',
		name: 'userId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the user to perform the operation on',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup', 'delete', 'get', 'removeFromGroup', 'update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUsers',
				},
			},
			{
				displayName: 'By Email',
				name: 'userEmail',
				type: 'string',
				hint: 'Enter the user email',
				placeholder: 'e.g. sales@example.com',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
							errorMessage: 'Please enter a valid email address.',
						},
					},
				],
			},
			{
				displayName: 'By ID',
				name: 'userId',
				type: 'string',
				hint: 'Enter the user id',
				placeholder: 'e.g. 123456789879230471055',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:addToGroup                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group',
		name: 'groupId',
		required: true,
		type: 'resourceLocator',
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the group to perform the operation on',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['addToGroup', 'removeFromGroup'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchGroups',
				},
			},
			{
				displayName: 'By ID',
				name: 'groupId',
				type: 'string',
				placeholder: 'e.g. 0123kx3o1habcdf',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		placeholder: 'e.g. Nathan',
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
		placeholder: 'e.g. Smith',
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
		displayName: 'Username',
		name: 'username',
		type: 'string',
		placeholder: 'e.g. n.smith',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['user'],
			},
		},
		default: '',
		description:
			"The username that will be set to the user. Example: If you domain is example.com and you set the username to n.smith then the user's final email address will be n.smith@example.com.",
	},
	{
		displayName: 'Domain Name or ID',
		name: 'domain',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				displayName: 'Change Password at Next Login',
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
										name: 'ISDN',
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
										name: 'TTY TDD',
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
								description: "Whether this is the user's primary phone number",
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
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'multiOptions',
				default: [],
				description: 'Select the roles you want to assign to the user',
				options: rolesOptions,
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				placeholder: 'Add or Edit Custom Fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Allows editing and adding of custom fields',
				options: [
					{
						name: 'fieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Schema Name or ID',
								name: 'schemaName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getSchemas',
								},
								default: '',
								description:
									'Select the schema to use for custom fields. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Name or ID',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
								description: 'Enter a field name from the selected schema',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Provide a value for the selected field',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		required: true,
		default: 'simplified',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simplified',
				description:
					'Only return specific fields: kind, ID, primaryEmail, name (with subfields), isAdmin, lastLoginTime, creationTime, and suspended',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Return all fields from the API response',
			},
			{
				name: 'Select Included Fields',
				value: 'select',
				description: 'Choose specific fields to include',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		default: [],
		displayOptions: {
			show: {
				output: ['select'],
				operation: ['get'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Creation Time',
				value: 'creationTime',
			},
			{
				name: 'Is Admin',
				value: 'isAdmin',
			},
			{
				name: 'Kind',
				value: 'kind',
			},
			{
				name: 'Last Login Time',
				value: 'lastLoginTime',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'Primary Email',
				value: 'primaryEmail',
			},
			{
				name: 'Suspended',
				value: 'suspended',
			},
		],
		description: 'Fields to include in the response when "Select Included Fields" is chosen',
	},
	{
		displayName: 'Custom Fields',
		name: 'projection',
		type: 'options',
		required: true,
		options: [
			{
				name: "Don't Include",
				value: 'basic',
				description: 'Do not include any custom fields for the user',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Include custom fields from schemas requested in Custom Schema Names or IDs',
			},
			{
				name: 'Include All',
				value: 'full',
				description: 'Include all fields associated with this user',
			},
		],
		default: 'basic',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['user'],
			},
		},
		description: 'What subset of fields to fetch for this user',
	},
	{
		displayName: 'Custom Schema Names or IDs',
		name: 'customFieldMask',
		type: 'multiOptions',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['user'],
				'/projection': ['custom'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSchemas',
		},
		default: [],
		description:
			'A comma-separated list of schema names. All fields from these schemas are fetched. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		displayName: 'Output',
		name: 'output',
		type: 'options',
		required: true,
		default: 'simplified',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simplified',
				description:
					'Only return specific fields: kind, ID, primaryEmail, name (with subfields), isAdmin, lastLoginTime, creationTime, and suspended',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Return all fields from the API response',
			},
			{
				name: 'Select Included Fields',
				value: 'select',
				description: 'Choose specific fields to include',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		default: [],
		displayOptions: {
			show: {
				output: ['select'],
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Creation Time',
				value: 'creationTime',
			},
			{
				name: 'Is Admin',
				value: 'isAdmin',
			},
			{
				name: 'Kind',
				value: 'kind',
			},
			{
				name: 'Last Login Time',
				value: 'lastLoginTime',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'Primary Email',
				value: 'primaryEmail',
			},
			{
				name: 'Suspended',
				value: 'suspended',
			},
		],
		description: 'Fields to include in the response when "Select Included Fields" is chosen',
	},
	{
		displayName: 'Custom Fields',
		name: 'projection',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: "Don't Include",
				value: 'basic',
				description: 'Do not include any custom fields for the user',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Include custom fields from schemas requested in Custom Schema Names or IDs',
			},
			{
				name: 'Include All',
				value: 'full',
				description: 'Include all fields associated with this user',
			},
		],
		default: 'basic',
		description: 'What subset of fields to fetch for this user',
	},
	{
		displayName: 'Custom Schema Names or IDs',
		name: 'customFieldMask',
		type: 'multiOptions',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
				'/projection': ['custom'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSchemas',
		},
		default: [],
		description:
			'A comma-separated list of schema names. All fields from these schemas are fetched. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Customer',
				name: 'customer',
				type: 'string',
				default: '',
				description: "The unique ID for the customer's Google Workspace account",
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name. Use this field to get groups from a specific domain.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				placeholder: 'e.g. name:contact* email:contact*',
				default: '',
				description:
					'Query string to filter the results. Follow Google Admin SDK documentation. <a href="https://developers.google.com/admin-sdk/directory/v1/guides/search-users#examples" target="_blank">More info</a>.',
			},
			{
				displayName: 'Show Deleted',
				name: 'showDeleted',
				type: 'boolean',
				default: false,
				description: 'Whether retrieve the list of deleted users',
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'sortRules',
				displayName: 'Sort Rules',
				values: [
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
						description: 'Field to sort the results by',
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
						default: 'ASCENDING',
						description: 'Sort order direction',
					},
				],
			},
		],
		description: 'Define sorting rules for the results',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:update                                */
	/* -------------------------------------------------------------------------- */
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
				displayName: 'Suspend',
				name: 'suspendUi',
				type: 'boolean',
				default: false,
				description:
					'Whether to set the user as suspended. If set to OFF, the user will be reactivated. If not added, the status will remain unchanged.',
			},
			{
				displayName: 'Change Password at Next Login',
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
				placeholder: 'e.g. John',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Doe',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'e.g. MyStrongP@ssword123',
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
										name: 'ISDN',
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
										name: 'TTY TDD',
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
								placeholder: 'e.g. +1234567890',
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
				placeholder: 'e.g. john.doe@example.com',
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
								placeholder: 'e.g. john.doe.work@example.com',
							},
						],
					},
				],
			},
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'multiOptions',
				default: [],
				description: 'Select the roles you want to assign to the user',
				options: rolesOptions,
			},
			{
				displayName: 'Custom Fields',
				name: 'customFields',
				placeholder: 'Add or Edit Custom Fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Allows editing and adding of custom fields',
				options: [
					{
						name: 'fieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Schema Name or ID',
								name: 'schemaName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getSchemas',
								},
								default: '',
								description:
									'Select the schema to use for custom fields. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Name or ID',
								name: 'fieldName',
								type: 'string',
								default: '',
								required: true,
								description: 'Enter a field name from the selected schema',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Provide a value for the selected field',
							},
						],
					},
				],
			},
		],
	},
];
