import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get User Groups',
				value: 'getUserGroups',
			},
			{
				name: 'Get User Roles',
				value: 'getUserRoles',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const userFields = [
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
				resource: [
					'user',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'Short description of the user.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
		default: {},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: '',
				description:'If checked, the user will be set to active.',
			},
			{
				displayName: 'Building',
				name: 'building',
				type: 'string',
				default: '',
				description:'The Building address.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description:'City of the user.',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description:'The name of the company for the user.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description:'Country of the user.',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description:'Department of the user.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description:'The email address associated with the user.',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description:'The first name of the user.',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
				description:'The gender of the user.',
			},
			{
				displayName: 'Home Phone',
				name: 'home_phone',
				type: 'string',
				default: '',
				description:'Home phone of the user.',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description:'The last name of the user.',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description:'Location of the user.',
			},
			{
				displayName: 'Manager',
				name: 'manager',
				type: 'string',
				default: '',
				description:'Manager of the user.',
			},
			{
				displayName: 'Middle Name',
				name: 'middle_name',
				type: 'string',
				default: '',
				description:'The middle name of the user.',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone',
				type: 'string',
				default: '',
				description:'Mobile phone number of the user.',
			},
			{
				displayName: 'Password',
				name: 'user_password',
				type: 'string',
				default: '',
				description:'The user\'s password.',
			},
			{
				displayName: 'Password Needs Reset',
				name: 'password_needs_reset',
				type: 'boolean',
				default: '',
				description:'If checked, the password will need to be reset when the user logs in.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description:'The main phone number of the user.',
			},
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'string',
				default: '',
				description:'Roles of the user separated by comma.',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description:'The source.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description:'State for the user.',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description:'Street information for the user separated by comma.',
			},
			{
				displayName: 'User Name',
				name: 'user_name',
				type: 'string',
				default: '',
				description:'A username associated with the user (e.g. user_name.123).',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description:'Zip code for the user.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                user:getAll/getUserGroups                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getUserGroups',
					'getUserRoles',
				],
				resource: [
					'user',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getUserGroups',
					'getUserRoles',
				],
				resource: [
					'user',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
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
				resource: [
					'user',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the user.',
	},
	{
		displayName: 'User Name',
		name: 'user_name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				getOption: [
					'user_name',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the user.',
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				getOption: [
					'id',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the user.',
	},
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		default: '',
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
		required: true,
		description: 'Unique identifier of the user.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
					'getAll',
					'getUserGroups',
					'getUserRoles',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Display Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Display Values',
						value: 'true',
					},
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
				],
				default: 'false',
				description: 'Choose which values to return.',
			},
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Exclude Table API links for reference fields.',
			},
			{
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of fields to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results.',
			},
			{
				displayName: 'View',
				name: 'sysparm_view',
				type: 'boolean',
				default: false,
				description: 'Render the response according to the specified UI view (overridden by Fields option).',
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
				resource: [
					'user',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the user.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: '',
				description:'If checked, the user will be set to active.',
			},
			{
				displayName: 'Building',
				name: 'building',
				type: 'string',
				default: '',
				description:'The Building address.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description:'City of the user.',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description:'The name of the company for the user.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description:'Country of the user.',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description:'Department of the user.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description:'The email address associated with the user.',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description:'The first name of the user.',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
				description:'The gender of the user.',
			},
			{
				displayName: 'Home Phone',
				name: 'home_phone',
				type: 'string',
				default: '',
				description:'Home phone of the user.',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description:'The last name of the user.',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description:'Location of the user.',
			},
			{
				displayName: 'Manager',
				name: 'manager',
				type: 'string',
				default: '',
				description:'Manager of the user.',
			},
			{
				displayName: 'Middle Name',
				name: 'middle_name',
				type: 'string',
				default: '',
				description:'The middle name of the user.',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone',
				type: 'string',
				default: '',
				description:'Mobile phone number of the user.',
			},
			{
				displayName: 'Password',
				name: 'user_password',
				type: 'string',
				default: '',
				description:'The user\'s password.',
			},
			{
				displayName: 'Password Needs Reset',
				name: 'password_needs_reset',
				type: 'boolean',
				default: '',
				description:'If checked, the password will need to be reset when the user logs in.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description:'The main phone number of the user.',
			},
			{
				displayName: 'Roles',
				name: 'roles',
				type: 'string',
				default: '',
				description:'Roles of the user separated by comma.',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description:'The source.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description:'State for the user.',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				description:'Street information for the user separated by comma.',
			},
			{
				displayName: 'User Name',
				name: 'user_name',
				type: 'string',
				default: '',
				description:'A username associated with the user (e.g. user_name.123).',
			},
			{
				displayName: 'Zip Code',
				name: 'zip',
				type: 'string',
				default: '',
				description:'Zip code for the user.',
			},
		],
	},
] as INodeProperties[];
