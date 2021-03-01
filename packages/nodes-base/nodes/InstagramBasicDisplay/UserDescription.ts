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
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const userFields = [
	// ----------------------------------
	//         user: get
	// ----------------------------------
	{
		displayName: 'Return Self',
		name: 'returnSelf',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results for the active user.',
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
] as INodeProperties[];
