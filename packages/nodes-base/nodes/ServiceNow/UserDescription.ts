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
				name: 'Create',
				value: 'create',
				action: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many users',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a user',
			},
		],
		default: 'get',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:create                          */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Short Description',
		name: 'short_description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Short description of the user',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether to activate the user',
			},
			{
				displayName: 'Building',
				name: 'building',
				type: 'string',
				default: '',
				description: 'The Building address',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City of the user',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'The name of the company for the user',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'Department of the user',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address associated with the user',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'The first name of the user',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
				description: 'The gender of the user',
			},
			{
				displayName: 'Home Phone',
				name: 'home_phone',
				type: 'string',
				default: '',
				description: 'Home phone of the user',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The last name of the user',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the user',
			},
			{
				displayName: 'Manager',
				name: 'manager',
				type: 'string',
				default: '',
				description: 'Manager of the user',
			},
			{
				displayName: 'Middle Name',
				name: 'middle_name',
				type: 'string',
				default: '',
				description: 'The middle name of the user',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the user',
			},
			{
				displayName: 'Password',
				name: 'user_password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: "The user's password",
			},
			{
				displayName: 'Password Needs Reset',
				name: 'password_needs_reset',
				type: 'boolean',
				default: false,
				description: 'Whether to require a password reset when the user logs in',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The main phone number of the user',
			},
			{
				displayName: 'Role Names or IDs',
				name: 'roles',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUserRoles',
				},
				default: [],
				description:
					'Roles of the user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State for the user',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description: 'Street information for the user separated by comma',
			},
			{
				displayName: 'Username',
				name: 'user_name',
				type: 'string',
				default: '',
				// nodelinter-ignore-next-line
				description: 'A username associated with the user (e.g. user_name.123)',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Zip code for the user',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:getAll                                 */
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
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: ['operation'],
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Filter',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description:
					'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>.',
			},
			{
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:get/delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Retrieve Identifier',
		name: 'getOption',
		type: 'options',
		default: 'id',
		options: [
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Username',
				value: 'user_name',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		required: true,
		description: 'Unique identifier of the user',
	},
	{
		displayName: 'Username',
		name: 'user_name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				getOption: ['user_name'],
			},
		},
		required: true,
		description: 'Unique identifier of the user',
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				getOption: ['id'],
			},
		},
		required: true,
		description: 'Unique identifier of the user',
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		required: true,
		description: 'Unique identifier of the user',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: ['operation'],
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		required: true,
		description: 'Unique identifier of the user',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether to activate the user',
			},
			{
				displayName: 'Building',
				name: 'building',
				type: 'string',
				default: '',
				description: 'The Building address',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'City of the user',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'The name of the company for the user',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country of the user',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description: 'Department of the user',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address associated with the user',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'The first name of the user',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
				description: 'The gender of the user',
			},
			{
				displayName: 'Home Phone',
				name: 'home_phone',
				type: 'string',
				default: '',
				description: 'Home phone of the user',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The last name of the user',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'Location of the user',
			},
			{
				displayName: 'Manager',
				name: 'manager',
				type: 'string',
				default: '',
				description: 'Manager of the user',
			},
			{
				displayName: 'Middle Name',
				name: 'middle_name',
				type: 'string',
				default: '',
				description: 'The middle name of the user',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the user',
			},
			{
				displayName: 'Password',
				name: 'user_password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: "The user's password",
			},
			{
				displayName: 'Password Needs Reset',
				name: 'password_needs_reset',
				type: 'boolean',
				default: false,
				description: 'Whether to require a password reset when the user logs in',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'The main phone number of the user',
			},
			{
				displayName: 'Role Names or IDs',
				name: 'roles',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUserRoles',
				},
				default: [],
				description:
					'Roles of the user. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'State for the user',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description: 'Street information for the user separated by comma',
			},
			{
				displayName: 'Username',
				name: 'user_name',
				type: 'string',
				default: '',
				// nodelinter-ignore-next-line
				description: 'A username associated with the user (e.g. user_name.123)',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description: 'Zip code for the user',
			},
		],
	},
];
