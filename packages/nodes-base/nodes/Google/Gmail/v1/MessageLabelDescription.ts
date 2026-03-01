import type { INodeProperties } from 'n8n-workflow';

export const messageLabelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['messageLabel'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add a label to a message',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a label from a message',
			},
		],
		default: 'add',
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
				resource: ['messageLabel'],
				operation: ['add', 'remove'],
			},
		},
		placeholder: '172ce2c4a72cc243',
	},
	{
		displayName: 'Label Names or IDs',
		name: 'labelIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				resource: ['messageLabel'],
				operation: ['add', 'remove'],
			},
		},
		description:
			'The ID of the label. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
