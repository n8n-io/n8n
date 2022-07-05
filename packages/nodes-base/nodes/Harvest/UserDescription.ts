import {
	INodeProperties,
} from 'n8n-workflow';

const resource = [
	'user',
];

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: `Create a user`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a user`,
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a user',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all users',
			},

			{
				name: 'Me',
				value: 'me',
				description: 'Get data of authenticated user',
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update a user`,
			},
		],
		default: 'me',
		description: 'The operation to perform.',
	},

];

export const userFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                user:getAll                                 */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Returns a list of your users.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Pass true to only return active users and false to return inactive users.',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return users belonging to the user with the given ID.',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'The page number to use in pagination..',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource,
			},
		},
		description: 'The ID of the user you are retrieving.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource,
			},
		},
		description: 'The ID of the user you want to delete.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The first name of the user.',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The last name of the user.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The email of the user.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Can Create Invoices',
				name: 'can_create_invoices',
				type: 'boolean',
				default: false,
				description: 'Whether the user can create invoices. Only applicable to Project Managers.',
			},
			{
				displayName: 'Can Create Projects',
				name: 'can_create_projects',
				type: 'boolean',
				default: false,
				description: 'Whether the user can create projects. Only applicable to Project Managers.',
			},
			{
				displayName: 'Can See Rates',
				name: 'can_see_rates',
				type: 'boolean',
				default: false,
				description: 'Whether the user can see billable rates on projects. Only applicable to Project Managers.',
			},
			{
				displayName: 'Cost Rate',
				name: 'cost_rate',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The cost rate to use for this user when calculating a project’s costs vs billable amount.',
			},
			{
				displayName: 'Default Hourly Rate',
				name: 'default_hourly_rate',
				type: 'string',
				default: '0',
				description: 'The billable rate to use for this user when they are added to a project.',
			},
			{
				displayName: 'Has Access To All Future Projects',
				name: 'has_access_to_all_future_projects',
				type: 'boolean',
				default: false,
				description: 'Whether the user should be automatically added to future projects.',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the user is active or archived.',
			},
			{
				displayName: 'Is Admin',
				name: 'is_admin',
				type: 'boolean',
				default: false,
				description: 'Whether the user has Admin permissions.',
			},
			{
				displayName: 'Is Contractor',
				name: 'is_contractor',
				type: 'boolean',
				default: false,
				description: 'Whether the user is a contractor or an employee.',
			},
			{
				displayName: 'Is Project Manager',
				name: 'is_project_manager',
				type: 'boolean',
				default: false,
				description: 'Whether the user has Project Manager permissions.',
			},
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'string',
				default: '',
				description: 'The role names assigned to this person.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: 'The user’s timezone. Defaults to the company’s timezone. See a list of <a href="/api-v2/introduction/overview/supported-timezones/">supported time zones</a>.',
			},
			{
				displayName: 'Weekly Capacity',
				name: 'weekly_capacity',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 126000,
				description: 'The number of hours per week this person is available to work in seconds. Defaults to <code class="language-plaintext highlighter-rouge">126000</code> seconds (35 hours).',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Time Entry Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		description: 'The ID of the time entry to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'Can Create Invoices',
				name: 'can_create_invoices',
				type: 'boolean',
				default: false,
				description: 'Whether the user can create invoices. Only applicable to Project Managers.',
			},
			{
				displayName: 'Can Create Projects',
				name: 'can_create_projects',
				type: 'boolean',
				default: false,
				description: 'Whether the user can create projects. Only applicable to Project Managers.',
			},
			{
				displayName: 'Can See Rates',
				name: 'can_see_rates',
				type: 'boolean',
				default: false,
				description: 'Whether the user can see billable rates on projects. Only applicable to Project Managers.',
			},
			{
				displayName: 'Cost Rate',
				name: 'cost_rate',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The cost rate to use for this user when calculating a project’s costs vs billable amount.',
			},
			{
				displayName: 'Default Hourly Rate',
				name: 'default_hourly_rate',
				type: 'string',
				default: '0',
				description: 'The billable rate to use for this user when they are added to a project.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The user email',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'The user first name',
			},
			{
				displayName: 'Has Access To All Future Projects',
				name: 'has_access_to_all_future_projects',
				type: 'boolean',
				default: false,
				description: 'Whether the user should be automatically added to future projects.',
			},
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the user is active or archived.',
			},
			{
				displayName: 'Is Admin',
				name: 'is_admin',
				type: 'boolean',
				default: false,
				description: 'Whether the user has Admin permissions.',
			},
			{
				displayName: 'Is Contractor',
				name: 'is_contractor',
				type: 'boolean',
				default: false,
				description: 'Whether the user is a contractor or an employee.',
			},
			{
				displayName: 'Is Project Manager',
				name: 'is_project_manager',
				type: 'boolean',
				default: false,
				description: 'Whether the user has Project Manager permissions.',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The user last name',
			},
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'string',
				default: '',
				description: 'The role names assigned to this person.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: 'The user’s timezone. Defaults to the company’s timezone. See a list of <a href="/api-v2/introduction/overview/supported-timezones/">supported time zones</a>.',
			},
			{
				displayName: 'Weekly Capacity',
				name: 'weekly_capacity',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 126000,
				description: 'The number of hours per week this person is available to work in seconds. Defaults to <code class="language-plaintext highlighter-rouge">126000</code> seconds (35 hours).',
			},
		],
	},

];
