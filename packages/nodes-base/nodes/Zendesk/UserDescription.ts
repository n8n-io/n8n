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
				description: 'Get all users',
				action: 'Get many users',
			},
			{
				name: 'Get Organizations',
				value: 'getOrganizations',
				description: "Get a user's organizations",
				action: "Get a user's organizations",
			},
			{
				name: 'Get Related Data',
				value: 'getRelatedData',
				description: 'Get data related to the user',
				action: 'Get data related to a user',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search users',
				action: 'Search a user',
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
	/*                                user:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		required: true,
		description: "The user's name",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'An alias displayed to end users',
			},
			{
				displayName: 'Custom Role ID',
				name: 'custom_role_id',
				type: 'number',
				default: 0,
				description: 'A custom role if the user is an agent on the Enterprise plan',
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
				description: 'Any details you want to store about the user, such as an address',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: "The user's primary email address",
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description: 'A unique identifier from another system',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Locale',
				name: 'locale',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLocales',
				},
				default: '',
				description:
					'The user\'s locale. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Moderator',
				name: 'moderator',
				type: 'boolean',
				default: false,
				description: 'Whether the user has forum moderation capabilities',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Any notes you want to store about the user',
			},
			{
				displayName: 'Only Private Comments',
				name: 'only_private_comments',
				type: 'boolean',
				default: false,
				description: 'Whether the user can only create private comments',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				type: 'options',
				default: '',
				description:
					'The ID of the user\'s organization. If the user has more than one organization memberships, the ID of the user\'s default organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: "The user's primary phone number",
			},
			{
				displayName: 'Report CSV',
				name: 'report_csv',
				type: 'boolean',
				default: false,
				description:
					'Whether or not the user can access the CSV report on the Search tab of the Reporting page in the Support admin interface',
			},
			{
				displayName: 'Restricted Agent',
				name: 'restricted_agent',
				type: 'boolean',
				default: false,
				description:
					'Whether the agent has any restrictions; false for admins and unrestricted agents, true for other agents',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				options: [
					{
						name: 'End User',
						value: 'end-user',
					},
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Admin',
						value: 'admin',
					},
				],
				default: '',
				description: "The user's role",
			},
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				default: '',
				description: "The user's signature. Only agents and admins can have signatures.",
			},
			{
				displayName: 'Suspended',
				name: 'suspended',
				type: 'boolean',
				default: false,
				description:
					'Whether the agent is suspended. Tickets from suspended users are also suspended, and these users cannot sign in to the end user portal.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'The array of tags applied to this user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket Restriction',
				name: 'ticket_restriction',
				type: 'options',
				options: [
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Groups',
						value: 'groups',
					},
					{
						name: 'Assigned',
						value: 'assigned',
					},
					{
						name: 'Requested',
						value: 'requested',
					},
				],
				default: '',
				description: 'Specifies which tickets the user has access to',
			},
			{
				displayName: 'Timezone',
				name: 'time_zone',
				type: 'string',
				default: '',
				description: "The user's time zone",
			},
			{
				displayName: 'User Fields',
				name: 'userFieldsUi',
				placeholder: 'Add User Field',
				description: "Values of custom fields in the user's profile",
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'userFieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getUserFields',
								},
								default: '',
								description:
									'Name of the field to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field',
							},
						],
					},
				],
			},
			{
				displayName: 'Verified',
				name: 'verified',
				type: 'boolean',
				default: false,
				description: "Whether the user's primary identity is verified or not",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'An alias displayed to end users',
			},
			{
				displayName: 'Custom Role ID',
				name: 'custom_role_id',
				type: 'number',
				default: 0,
				description: 'A custom role if the user is an agent on the Enterprise plan',
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
				description: 'Any details you want to store about the user, such as an address',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: "The user's primary email address",
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
				description: 'A unique identifier from another system',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Locale',
				name: 'locale',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLocales',
				},
				default: '',
				description:
					'The user\'s locale. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Moderator',
				name: 'moderator',
				type: 'boolean',
				default: false,
				description: 'Whether the user has forum moderation capabilities',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: "The user's name",
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Any notes you want to store about the user',
			},
			{
				displayName: 'Only Private Comments',
				name: 'only_private_comments',
				type: 'boolean',
				default: false,
				description: 'Whether the user can only create private comments',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				type: 'options',
				default: '',
				description:
					'The ID of the user\'s organization. If the user has more than one organization memberships, the ID of the user\'s default organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: "The user's primary phone number",
			},
			{
				displayName: 'Report CSV',
				name: 'report_csv',
				type: 'boolean',
				default: false,
				description:
					'Whether or not the user can access the CSV report on the Search tab of the Reporting page in the Support admin interface',
			},
			{
				displayName: 'Restricted Agent',
				name: 'restricted_agent',
				type: 'boolean',
				default: false,
				description:
					'Whether the agent has any restrictions; false for admins and unrestricted agents, true for other agents',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				options: [
					{
						name: 'End User',
						value: 'end-user',
					},
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Admin',
						value: 'admin',
					},
				],
				default: '',
				description: "The user's role",
			},
			{
				displayName: 'Signature',
				name: 'signature',
				type: 'string',
				default: '',
				description: "The user's signature. Only agents and admins can have signatures.",
			},
			{
				displayName: 'Suspended',
				name: 'suspended',
				type: 'boolean',
				default: false,
				description:
					'Whether the agent is suspended. Tickets from suspended users are also suspended, and these users cannot sign in to the end user portal.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'The array of tags applied to this user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Ticket Restriction',
				name: 'ticket_restriction',
				type: 'options',
				options: [
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Groups',
						value: 'groups',
					},
					{
						name: 'Assigned',
						value: 'assigned',
					},
					{
						name: 'Requested',
						value: 'requested',
					},
				],
				default: '',
				description: 'Specifies which tickets the user has access to',
			},
			{
				displayName: 'Timezone',
				name: 'time_zone',
				type: 'string',
				default: '',
				description: "The user's time zone",
			},
			{
				displayName: 'User Fields',
				name: 'userFieldsUi',
				placeholder: 'Add User Field',
				description: "Values of custom fields in the user's profile",
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'userFieldValues',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getUserFields',
								},
								default: '',
								description:
									'Name of the field to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field',
							},
						],
					},
				],
			},
			{
				displayName: 'Verified',
				name: 'verified',
				type: 'boolean',
				default: false,
				description: "Whether the user's primary identity is verified or not",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 user:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   user:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Roles',
				name: 'role',
				type: 'multiOptions',
				options: [
					{
						name: 'End User',
						value: 'end-user',
					},
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'Admin',
						value: 'admin',
					},
				],
				default: [],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   user:search                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['search'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
			},
			{
				displayName: 'External ID',
				name: 'external_id',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                             user:getRelatedData                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getRelatedData'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                              user:getOrganizations                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getOrganizations'],
			},
		},
	},
];
