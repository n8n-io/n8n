import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Get',
				value: 'info',
				description: 'Get information about a user',
				action: 'Get information about a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get a list of many users',
				action: 'Get many users',
			},
			{
				name: "Get User's Status",
				value: 'getPresence',
				description: 'Get online status of a user',
				action: "Get a user's presence status",
			},
			{
				name: "Update User's Profile",
				value: 'updateProfile',
				description: "Update a user's profile",
				action: "Update a user's profile",
			},
		],
		default: 'info',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:info                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		description: 'The ID of the user to get information about',
		displayOptions: {
			show: {
				operation: ['info'],
				resource: ['user'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a user...',
				typeOptions: {
					searchListMethod: 'getUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack User ID',
						},
					},
				],
				placeholder: 'U123AB45JGM',
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
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:getPresence                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		description: 'The ID of the user to get the online status of',
		displayOptions: {
			show: {
				operation: ['getPresence'],
				resource: ['user'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a user...',
				typeOptions: {
					searchListMethod: 'getUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack User ID',
						},
					},
				],
				placeholder: 'U123AB45JGM',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:update user profile                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateProfile'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldUi',
				placeholder: 'Add Custom Fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customFieldValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTeamFields',
								},
								default: '',
								description:
									'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
							},
							{
								displayName: 'Alt',
								name: 'alt',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'This field can only be changed by admins for users on paid teams',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Set Status',
				name: 'status',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Set Status',
				options: [
					{
						displayName: 'Set Status',
						name: 'set_status',
						values: [
							{
								displayName: 'Status Emoji',
								name: 'status_emoji',
								type: 'string',
								default: '',
								description:
									'Is a string referencing an emoji enabled for the Slack team, such as :mountain_railway:',
							},
							{
								displayName: 'Status Expiration',
								name: 'status_expiration',
								type: 'dateTime',
								default: '',
								description:
									'The number of minutes to wait until this status expires and is cleared. Optional.',
							},
							{
								displayName: 'Status Text',
								name: 'status_text',
								type: 'string',
								default: '',
								description: 'Allows up to 100 characters, though we strongly encourage brevity',
							},
						],
					},
				],
			},
			{
				displayName: 'User ID',
				name: 'user',
				type: 'string',
				default: '',
				description:
					'ID of user to change. This argument may only be specified by team admins on paid teams.',
			},
		],
	},
];
