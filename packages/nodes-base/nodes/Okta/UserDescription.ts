import type { INodeProperties } from 'n8n-workflow';
const BASE_API_URL = '/api/v1/users/';
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
			// Create Operation
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
				routing: {
					request: {
						method: 'POST',
						url: BASE_API_URL,
						qs: { activate: '={{$parameter["activate"]}}' },
						returnFullResponse: true,
					},
				},
				action: 'Create a new User',
			},
			// Delete Operation
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an empty Bucket',
				routing: {
					request: {
						method: 'DELETE',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						returnFullResponse: true,
					},
				},
				action: 'Delete a user',
			},
			// Get Operation
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						returnFullResponse: true,
						qs: {},
					},
				},
				action: 'Get a user',
			},
			// Get All Operation
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				routing: {
					request: {
						method: 'GET',
						url: BASE_API_URL,
						qs: { q: '={{$parameter["searchQuery"]}}' },
					},
					send: {
						paginate: true,
					},
				},
				action: 'Get many users',
			},
			// Update Operation
			{
				name: 'Update',
				value: 'update',
				description: 'Update users',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						qs: {
							project: '={{$parameter["projectId"]}}',
						},
						returnFullResponse: true,
					},
				},
				action: 'Update a user',
			},
		],
		default: 'getAll',
	},
];

export const userFields: INodeProperties[] = [
	// Fields for 'create' and 'update' operations
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		placeholder: 'First Name',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		routing: {
			send: {
				property: 'profile.firstName',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		placeholder: 'Last Name',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		routing: {
			send: {
				property: 'profile.lastName',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		placeholder: 'Email',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		routing: {
			send: {
				property: 'profile.email',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Login',
		name: 'login',
		type: 'string',
		required: true,
		placeholder: 'Login',
		description: 'Unique identifier for the user (username)',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		routing: {
			send: {
				property: 'profile.login',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Credentials',
		name: 'getCredentials',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: {},
		placeholder: 'Add credential field',
		options: [
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				routing: {
					send: {
						property: 'credentials.password.value',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Recovery Question Question',
				name: 'recoveryQuestionQuestion',
				type: 'string',
				default: '',
				routing: {
					send: {
						property: 'credentials.recovery_question.question',
						type: 'body',
					},
				},
			},
			{
				displayName: 'Recovery Question Answer',
				name: 'recoveryQuestionAnswer',
				type: 'string',
				default: '',
				routing: {
					send: {
						property: 'credentials.recovery_question.answer',
						type: 'body',
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'getFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: {},
		routing: {
			send: {
				property: 'profile',
				type: 'body',
			},
		},
		placeholder: 'Add additional field',
		options: [
			{
				displayName: 'Second Email',
				name: 'secondEmail',
				type: 'string',
				typeOptions: { email: true },
				default: '',
			},
			{
				displayName: 'Middle Name',
				name: 'middleName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Honorific Prefix',
				name: 'honorificPrefix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Honorific Suffix',
				name: 'honorificSuffix',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Nick Name',
				name: 'nickName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Profile Url',
				name: 'profileUrl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Primary Phone',
				name: 'primaryPhone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
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
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Postal Address',
				name: 'postalAddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Preferred Language',
				name: 'preferredLanguage',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User Type',
				name: 'userType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Employee Number',
				name: 'employeeNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Cost Center',
				name: 'costCenter',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Division',
				name: 'division',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
			{
				displayName: 'ManagerId',
				name: 'managerId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Manager',
				name: 'manager',
				type: 'string',
				default: '',
			},
		],
	},
	// Fields specific to 'create' operation
	{
		displayName: 'Activate',
		name: 'activate',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to activate the user',
	},
	// Fields specific to 'getAll' operation
	{
		displayName: 'Search Query',
		name: 'searchQuery',
		type: 'string',
		placeholder: 'Filter Users by email, last name, or first name',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: '',
		routing: {
			request: {
				qs: {
					prefix: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
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
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '00u1abcd2345EfGHIjk6',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The user you want to operate on. Choose from the list, or specify an ID.',
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
			maxValue: 200,
		},
		default: 20,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
		description: 'Max number of results to return',
	},
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
];
