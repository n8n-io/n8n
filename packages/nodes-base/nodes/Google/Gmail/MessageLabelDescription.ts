import {
	INodeProperties,
} from 'n8n-workflow';

export const messageLabelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'messageLabel',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a label to a message',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a label from a message',
			},
		],
		default: 'add',
		description: 'The operation to perform',
	},
];

export const messageLabelFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'messageLabel',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		placeholder: '172ce2c4a72cc243',
		description: 'The message ID of your email.',
	},
	{
		displayName: 'Label IDs',
		name: 'labelIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'messageLabel',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		description: 'The ID of the label',
	},
];
