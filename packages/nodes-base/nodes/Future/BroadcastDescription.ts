import { INodeProperties } from 'n8n-workflow';

export const broadcastOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['broadcast']
			}
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get broadcast by Id'
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send broadcast to user'
			}
		],
		default: 'get',
		description: 'Interact with Broadcast'
	}
] as INodeProperties[];

export const broadcastFields = [
	/* -------------------------------------------------------------------------- */
	/*                                event:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Broadcast Id',
		name: 'broadcast_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['broadcast'],
				operation: ['get']
			}
		},
		description: 'Broadcast Id'
	},

	/* -------------------------------------------------------------------------- */
	/*                                event:send                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Id',
		name: 'user_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['broadcast'],
				operation: ['send']
			}
		},
		description: 'User Id'
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['broadcast'],
				operation: ['send']
			}
		},
		description: 'Broadcast title'
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['broadcast'],
				operation: ['send']
			}
		},
		description: 'Broadcast body'
	}
] as INodeProperties[];
