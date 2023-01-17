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
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new user, or update the current one if it already exists (upsert)',
				action: 'Create or update a user',
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
		],
		default: 'upsert',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:upsert                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'User ID',
				value: 'userId',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['upsert'],
			},
		},
		default: '',
		description: 'Identifier to be used',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['upsert'],
			},
		},
		default: '',
	},
	{
		displayName: "Create If Doesn't Exist",
		name: 'preferUserId',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['upsert'],
				identifier: ['userId'],
			},
		},
		default: true,
		description: 'Whether to create a new user if the idetifier does not exist',
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
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Data Fields',
				name: 'dataFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Data Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'dataFieldValues',
						displayName: 'Data Field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'The end user specified key of the user defined data',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The end user specified value of the user defined data',
							},
						],
					},
				],
			},
			{
				displayName: 'Merge Nested Objects',
				name: 'mergeNestedObjects',
				type: 'boolean',
				default: false,
				description:
					'Whether to merge top level objects instead of overwriting (default: false), e.g. if user profile has data: {mySettings:{mobile:true}} and change contact field has data: {mySettings:{email:true}}, the resulting profile: {mySettings:{mobile:true,email:true}}',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'User ID',
				value: 'userId',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
			},
		},
		default: 'email',
		description: 'Identifier to be used',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
				by: ['userId'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular user',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['delete'],
				by: ['email'],
			},
		},
		default: '',
		description: 'Email for a particular user',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 user:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'User ID',
				value: 'userId',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		default: 'email',
		description: 'Identifier to be used',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				by: ['userId'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular user',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				by: ['email'],
			},
		},
		default: '',
		description: 'Email for a particular user',
	},
];
