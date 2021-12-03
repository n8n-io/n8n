import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters,
	getUserProfileFields
} from '../GenericFunctions';

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
				name: 'Get All',
				value: 'getAll',
				description: 'Find all users',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Add a new user to the installation',
			},
			{
				name: 'Get By Username',
				value: 'getByUsername',
				description: 'Get user by username',
			},
			{
				name: 'Get By Email',
				value: 'getByEmail',
				description: 'Get user by email',
			},
			{
				name: 'Get By ID',
				value: 'getById',
				description: 'Get user by user id',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing user',
			},
			{
				name: 'Soft Delete',
				value: 'softDelete',
				description: 'Soft deletes an user by id',
			},
			{
				name: 'Hard Delete',
				value: 'hardDelete',
				description: 'Hard deletes an user by id',
			},
			{
				name: 'Get Current',
				value: 'getCurrent',
				description: 'Returns the current user',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  userFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 user:getAll                              */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('user'),

	/* -------------------------------------------------------------------------- */
	/*                                 user:create                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Username',
		name: 'username',
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
		description: 'Username of the user.',
	},
	{
		displayName: 'Email',
		name: 'email',
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
		description: 'Email of the user.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'number',
		typeOptions: {
			numberStepSize: 1,
		},
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
		description: 'Status of the User.',
	},
	{
		displayName: 'Content Container ID',
		name: 'contentcontainer_id',
		type: 'number',
		typeOptions: {
			numberStepSize: 1,
		},
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
		description: 'ID of the content container.',
	},

	...getUserProfileFields('create'),

	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		required: true,
		typeOptions: {
			password: true,
		},
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
		description: 'The password of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:getByUsername                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getByUsername',
				],
			},
		},
		default: '',
		description: 'The username of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:getByEmail                              */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getByEmail',
				],
			},
		},
		default: '',
		description: 'The email of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:getById                              */
	/* -------------------------------------------------------------------------- */
	 {
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getById',
				],
			},
		},
		default: '',
		description: 'The id of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:update                              */
	/* -------------------------------------------------------------------------- */
	 {
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
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
		default: '',
		description: 'The id of the user.',
	},

	{
		displayName: 'Account',
		name: 'account',
		type: 'collection',
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
		default: [],
		description: '',
		options: [
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'The username of the user.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email of the user.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'number',
				// typeOptions: {
				// 	numberStepSize: 1,
				// },
				default: '',
				description: 'The status o the user.',
			},
			{
				displayName: 'Content Container ID',
				name: 'contentcontainer_id',
				type: 'number',
				// typeOptions: {
				// 	numberStepSize: 1,
				// },
				default: '',
				description: 'The ID of the content container.',
			},
		],
	},

	...getUserProfileFields('update'),

	{
		displayName: 'Password',
		name: 'password',
		type: 'collection',
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
		default: [],
		description: '',
		options: [
			{
				displayName: 'New Password',
				name: 'newPassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The new password of the user.'
			},
		],
	},
	//
	// {
	// 	displayName: 'Password',
	// 	name: 'password',
	// 	type: 'string',
	// 	required: true,
	// 	typeOptions: {
	// 		password: true,
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'user',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: '',
	// },

	/* -------------------------------------------------------------------------- */
	/*                                 user:softDelete                              */
	/* -------------------------------------------------------------------------- */
	 {
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'softDelete',
				],
			},
		},
		default: '',
		description: 'The id of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:hardDelete                              */
	/* -------------------------------------------------------------------------- */
	 {
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'hardDelete',
				],
			},
		},
		default: '',
		description: 'The id of the user.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:getCurrent                              */
	/* -------------------------------------------------------------------------- */

	// No params are needed for this endpoint

] as INodeProperties[];
