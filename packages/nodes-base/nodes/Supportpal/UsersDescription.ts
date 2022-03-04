import { INodeProperties } from 'n8n-workflow';

export const usersDescription = [
	// --------------------------
	//         User - Create
	// --------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		description: 'The email of the user.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update', 'get', 'delete'],
			},
		},
		description: 'The ID of the user.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update', 'get', 'getAll'],
			},
		},
		description: 'Return simplified response. Only returns the user data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: {},
		description: 'Additional optional fields of the user.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Brand ID',
				name: 'brand_id',
				type: 'number',
				default: 0,
				description:
					'The brand the user is being registered to, will use the default brand if not entered.',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'The first name of the user.',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'The last name of the user.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The password of the user.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'json',
				default: '',
				description: 'Phone number of the user.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user, as a two letter string like "GB".',
			},
			{
				displayName: 'Language Code',
				name: 'language_code',
				type: 'string',
				default: '',
				description:
					'The two letter language code, like "en", will default to system default if not entered.',
			},
			{
				displayName: 'Time Zone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The timezone of the user, like "Europe/London", will default to system default if not entered.',
			},
			{
				displayName: 'Confirmed?',
				name: 'confirmed',
				type: 'boolean',
				default: false,
				description:
					'If the user has confirmed ownership of their email or not, this is usually done by email when a user registers themselves but can also be set manually. Requires a password to be set to true.',
			},
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: true,
				description:
					'If the user account is active or not. Inactive users cannot log in to the frontend.',
			},
			{
				displayName: 'Organisation',
				name: 'organisation',
				type: 'string',
				default: '',
				description: 'If creating a new organisation, use this field.',
			},
			{
				displayName: 'Organisation ID',
				name: 'organisation_id',
				type: 'number',
				default: 0,
				description: 'If adding to an existing organisation, enter the organisation ID.',
			},
			{
				displayName: 'Organizsation Access?',
				name: 'organisation_access_level',
				type: 'boolean',
				default: true,
				description:
					'The access level in the organisation, either Manager (false) or User (true). Defaults to 0 for new organisation, 1 for existing organisation. Only needed with the "organisation_id" field.',
			},
			{
				displayName: 'Organisation Notifications?',
				name: 'organisation_notifications',
				type: 'boolean',
				default: true,
				description:
					'If user is an organisation manager or owner, should they receive emails on updates for tickets opened by other organisation users.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customfield',
				type: 'json',
				default: '',
				description: 'An array of custom fields values, keyed by their ID.',
			},
			{
				displayName: 'Groups',
				name: 'groups',
				type: 'json',
				default: '',
				description: 'An array of group IDs that the user belongs to.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		default: {},
		description: 'Additional optional fields of the user.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'The first name of the user.',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'The last name of the user.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email address of the user.',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The password of the user.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'json',
				default: '',
				description: 'Phone number of the user.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user, as a two letter string like "GB".',
			},
			{
				displayName: 'Language Code',
				name: 'language_code',
				type: 'string',
				default: '',
				description:
					'The two letter language code, like "en", will default to system default if not entered.',
			},
			{
				displayName: 'Time Zone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The timezone of the user, like "Europe/London", will default to system default if not entered.',
			},
			{
				displayName: 'Confirmed?',
				name: 'confirmed',
				type: 'boolean',
				default: false,
				description:
					'If the user has confirmed ownership of their email or not, this is usually done by email when a user registers themselves but can also be set manually. Requires a password to be set to true.',
			},
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: true,
				description:
					'If the user account is active or not. Inactive users cannot log in to the frontend.',
			},
			{
				displayName: 'Organisation',
				name: 'organisation',
				type: 'string',
				default: '',
				description: 'If creating a new organisation, use this field.',
			},
			{
				displayName: 'Organisation ID',
				name: 'organisation_id',
				type: 'number',
				default: 0,
				description: 'If adding to an existing organisation, enter the organisation ID.',
			},
			{
				displayName: 'Organizsation Access?',
				name: 'organisation_access_level',
				type: 'boolean',
				default: true,
				description:
					'The access level in the organisation, either Manager (false) or User (true). Defaults to 0 for new organisation, 1 for existing organisation. Only needed with the "organisation_id" field.',
			},
			{
				displayName: 'Organisation Notifications?',
				name: 'organisation_notifications',
				type: 'boolean',
				default: true,
				description:
					'If user is an organisation manager or owner, should they receive emails on updates for tickets opened by other organisation users.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customfield',
				type: 'json',
				default: '',
				description: 'An array of custom fields values, keyed by their ID.',
			},
			{
				displayName: 'Groups',
				name: 'groups',
				type: 'json',
				default: '',
				description: 'An array of group IDs that the user belongs to.',
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: {},
		description: 'Query Parameters for filtering the users.',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Brand ID',
				name: 'brand_id',
				type: 'number',
				default: 0,
				description: 'The brand the user is registered to.',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
				description: 'The first name of the user.',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'The last name of the user.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email of the user.',
			},
			{
				displayName: 'Confirmed?',
				name: 'confirmed',
				type: 'boolean',
				default: false,
				description: 'If the user has confirmed ownership of their email or not',
			},
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: true,
				description:
					'If the user account is active or not. Inactive users cannot log in to the frontend.',
			},
			{
				displayName: 'Organisation ID',
				name: 'organisation_id',
				type: 'number',
				default: 0,
				description: 'Search for users by their organisation ID.',
			},
			{
				displayName: 'Organisation Name',
				name: 'organisation_name',
				type: 'string',
				default: '',
				description: 'Search for users by their organisation name.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the user.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user, as a two letter string like "GB".',
			},
			{
				displayName: 'Language Code',
				name: 'language_code',
				type: 'string',
				default: '',
				description: 'The two letter language code, like "en".',
			},
			{
				displayName: 'Custom Fields',
				name: 'customfield',
				type: 'json',
				default: '',
				description: 'An array of custom fields values, keyed by their ID.',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 1,
				description: 'The first result to start from.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'The amount of results to fetch.',
			},
			{
				displayName: 'Order Column',
				name: 'order_column',
				type: 'string',
				default: 'id',
				description: 'The column to sort by.',
			},
			{
				displayName: 'Order Direction',
				name: 'order_direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'The ordering of the results.',
			},
		],
	},
] as INodeProperties[];
