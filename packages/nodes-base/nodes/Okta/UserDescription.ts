import type { INodeProperties } from 'n8n-workflow';

import { getCursorPaginator, simplifyGetAllResponse, simplifyGetResponse } from './UserFunctions';
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
				action: 'Create a new user',
			},
			// Delete Operation
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an existing user',
				routing: {
					request: {
						method: 'DELETE',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						returnFullResponse: true,
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete a user',
			},
			// Get Operation
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a user',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						returnFullResponse: true,
						qs: {},
					},
					output: {
						postReceive: [simplifyGetResponse],
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
						qs: { search: '={{$parameter["searchQuery"]}}' },
						returnFullResponse: true,
					},
					output: {
						postReceive: [simplifyGetAllResponse],
					},
					send: {
						paginate: true,
					},
					operations: {
						pagination: getCursorPaginator(),
					},
				},
				action: 'Get many users',
			},
			// Update Operation
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing user',
				routing: {
					request: {
						method: 'POST',
						url: '={{"/api/v1/users/" + $parameter["userId"]}}',
						returnFullResponse: true,
					},
				},
				action: 'Update a user',
			},
		],
		default: 'getAll',
	},
];
const mainProfileFields: INodeProperties[] = [
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		placeholder: 'e.g. Nathan',
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
		placeholder: 'e.g. Smith',
		default: '',
		routing: {
			send: {
				property: 'profile.lastName',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Username',
		name: 'login',
		type: 'string',
		placeholder: 'e.g. nathan@example.com',
		hint: 'Unique identifier for the user, must be an email',
		default: '',
		routing: {
			send: {
				property: 'profile.login',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. nathan@example.com',
		default: '',
		routing: {
			send: {
				property: 'profile.email',
				type: 'body',
			},
		},
	},
];
const createFields: INodeProperties[] = [
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.city',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Cost Center',
		name: 'costCenter',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.costCenter',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.countryCode',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.department',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.displayName',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Division',
		name: 'division',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.division',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Employee Number',
		name: 'employeeNumber',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.employeeNumber',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Honorific Prefix',
		name: 'honorificPrefix',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.honorificPrefix',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Honorific Suffix',
		name: 'honorificSuffix',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.honorificSuffix',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Locale',
		name: 'locale',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.locale',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Manager',
		name: 'manager',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.manager',
				type: 'body',
			},
		},
	},
	{
		displayName: 'ManagerId',
		name: 'managerId',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.managerId',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Middle Name',
		name: 'middleName',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.middleName',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Mobile Phone',
		name: 'mobilePhone',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.mobilePhone',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Nick Name',
		name: 'nickName',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.nickName',
				type: 'body',
			},
		},
	},
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
		displayName: 'Organization',
		name: 'organization',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.organization',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Postal Address',
		name: 'postalAddress',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.postalAddress',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Preferred Language',
		name: 'preferredLanguage',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.preferredLanguage',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Primary Phone',
		name: 'primaryPhone',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.primaryPhone',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Profile Url',
		name: 'profileUrl',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.profileUrl',
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
		displayName: 'Second Email',
		name: 'secondEmail',
		type: 'string',
		typeOptions: { email: true },
		default: '',
		routing: {
			send: {
				property: 'profile.secondEmail',
				type: 'body',
			},
		},
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.state',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Street Address',
		name: 'streetAddress',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.streetAddress',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.timezone',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.title',
				type: 'body',
			},
		},
	},
	{
		displayName: 'User Type',
		name: 'userType',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.userType',
				type: 'body',
			},
		},
	},
	{
		displayName: 'Zip Code',
		name: 'zipCode',
		type: 'string',
		default: '',
		routing: {
			send: {
				property: 'profile.zipCode',
				type: 'body',
			},
		},
	},
];
const updateFields: INodeProperties[] = createFields
	.concat(mainProfileFields)
	.sort((a, b) => a.displayName.localeCompare(b.displayName));

export const userFields: INodeProperties[] = [
	// Fields for 'get', 'update', and 'delete' operations

	{
		displayName: 'User',
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
				displayName: 'By username',
				name: 'login',
				type: 'string',
				placeholder: '',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 00u1abcd2345EfGHIjk6',
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
	//  Fields specific to 'create' operation
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		placeholder: 'e.g. Nathan',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
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
		placeholder: 'e.g. Smith',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
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
		displayName: 'Username',
		name: 'login',
		type: 'string',
		required: true,
		placeholder: 'e.g. nathan@example.com',
		hint: 'Unique identifier for the user, must be an email',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
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
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		placeholder: 'e.g. nathan@example.com',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
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
		displayName: 'Activate',
		name: 'activate',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: true,
		description: 'Whether to activate the user and allow access to all assigned applications',
	},
	{
		displayName: 'Fields',
		name: 'getCreateFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add field',
		options: createFields,
	},

	// Fields for 'update' operations
	{
		displayName: 'Fields',
		name: 'getUpdateFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		default: {},
		placeholder: 'Add field',
		options: updateFields,
	},

	// Fields specific to 'getAll' operation
	{
		displayName: 'Search Query',
		name: 'searchQuery',
		type: 'string',
		placeholder: 'e.g. profile.lastName sw "Smi"',
		hint: 'Filter users by using the allowed syntax. <a href="https://developer.okta.com/docs/reference/core-okta-api/#filter" target="_blank">More info</a>.',
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
	// Fields for 'get' and 'getAll' operations
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get', 'getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	// Fields specific to 'delete' operation
	{
		displayName: 'Send Email',
		name: 'sendEmail',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		default: false,
		description: 'Whether to send a deactivation email to the administrator',
	},
];
