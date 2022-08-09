import {
	INodeProperties,
} from 'n8n-workflow';

export const userListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Add a user to a list',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a user from a list',
				action: 'Remove a user from a list',
			},
		],
		default: 'add',
	},
];

export const userListFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                userList:add                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List Name or ID',
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
		description: 'Identifier to be used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		displayName: 'List Name or ID',
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
		description: 'Identifier to be used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description: 'Whether to unsubscribe email from list\'s associated channel - essentially a global unsubscribe',
			},
		],
	},
];
