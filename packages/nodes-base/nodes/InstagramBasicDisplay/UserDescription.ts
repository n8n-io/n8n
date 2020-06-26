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
				name: 'Get',
				value: 'get',
				description: 'Get a user\'s fields and edges',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const userFields = [
	{
		displayName: 'Return Self',
		name: 'returnSelf',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results for the currently signed-in user.',
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
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		placeholder: '17241438132341745',
		description: 'The ID of the user to be returned',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'get',
				],
				returnSelf: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
			{
				name: 'Account type',
				value: 'account_type',
			},
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Media',
				value: 'media',
			},
			{
				name: 'Media count',
				value: 'media_count',
			},
			{
				name: 'Username',
				value: 'username',
			},
		],
		default: '',
		description: 'Fields of the user be retrieved',
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
] as INodeProperties[];
