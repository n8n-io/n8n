import {
	INodeProperties,
} from 'n8n-workflow';

export const userListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add user to list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a user from a list',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const userListFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                userList:add                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Identifier to be used',
	},
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
				resource: [
					'userList',
				],
				operation: [
					'add',
				],
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
				resource: [
					'userList',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                userList:remove                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getLists',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'userList',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'Identifier to be used',
	},
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
				resource: [
					'userList',
				],
				operation: [
					'remove',
				],
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
				resource: [
					'userList',
				],
				operation: [
					'remove',
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
					'userList',
				],
				operation: [
					'remove',
				],
			},
		},
		options: [
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'number',
				default: 0,
				description: 'Attribute unsubscribe to a campaign',
			},
			{
				displayName: 'Channel Unsubscribe',
				name: 'channelUnsubscribe',
				type: 'boolean',
				default: false,
				description: `Unsubscribe email from list's associated channel - essentially a global unsubscribe`,
			},
		],
	},
];
