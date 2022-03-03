import { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
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
				name: 'Create/Update',
				value: 'create',
				description: `Create or update a user profile`,
			},
			{
				name: 'Alias',
				value: 'alias',
				description: 'Change a users identifier',
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
				description: 'Unsubscribe a user.',
			},
			{
				name: 'Re-subscribe',
				value: 'resubscribe',
				description: 'Resubscribe a user.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user.',
			},
			{
				name: 'Add Tags',
				value: 'addTags',
				description: 'Adds a tag to a users profile.',
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				description: 'Removes a tag from a users profile.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const userFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                user:create                                 */
/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
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
		description: 'The unique identifier of the customer',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The table to create the row in.',
			},
		],
	},
	{
		displayName: 'Data',
		name: 'dataAttributesUi',
		placeholder: 'Add Data',
		description: 'key value pairs that represent the custom user properties you want to update',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'dataAttributesValues',
				displayName: 'Data',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the property to set.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property to set.',
					},
				],
			},
		],
	},
	{
		displayName: 'Data',
		name: 'dataAttributesJson',
		type: 'json',
		default: '',
		required: false,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		description: 'key value pairs that represent the custom user properties you want to update',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
	},

/* -------------------------------------------------------------------------- */
/*                                   user:alias                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'alias',
				],
			},
		},
		description: 'The old unique identifier of the user',
	},
	{
		displayName: 'New ID',
		name: 'newId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'alias',
				],
			},
		},
		description: 'The new unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                   user:unsubscribe                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'unsubscribe',
				],
			},
		},
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:resubscribe                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'resubscribe',
				],
			},
		},
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
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
		description: 'The unique identifier of the user',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:addTags                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'addTags',
				],
			},
		},
		description: 'The unique identifier of the user',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'addTags',
				],
			},
		},
		description: 'Tags to add separated by ","',
	},
/* -------------------------------------------------------------------------- */
/*                                 user:removeTags                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'removeTags',
				],
			},
		},
		description: 'The unique identifier of the user',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'removeTags',
				],
			},
		},
		description: 'Tags to remove separated by ","',
	},
];
