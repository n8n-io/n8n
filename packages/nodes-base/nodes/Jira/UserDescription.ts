import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new user',
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
				description: 'Retrieve a user',
				action: 'Get a user',
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
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Email Address',
		name: 'emailAddress',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
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
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description: 'Password for the user. If a password is not set, a random password is generated.',
				typeOptions: {
					password: true,
				},
			},
			{
				displayName: 'Notification',
				name: 'notification',
				type: 'boolean',
				default: false,
				description: 'Whether to send the user an email confirmation that they have been added to Jira',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		description: 'Account ID of the user to delete',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		default: '',
		description: 'Account ID of the user to retrieve',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'multiOptions',
				default: [],
				description: 'Include more information about the user',
				options: [
					{
						name: 'Groups',
						value: 'groups',
						description: 'Include all groups to which the user belongs',
					},
					{
						name: 'Application Roles',
						value: 'applicationRoles',
						description: 'Include details of all the applications the user can access',
					},
				],
			},
		],
	},
];
