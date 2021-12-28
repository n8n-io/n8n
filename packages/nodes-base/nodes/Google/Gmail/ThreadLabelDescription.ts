import {
	INodeProperties,
} from 'n8n-workflow';

export const threadLabelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'threadLabel',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a label to a thread',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a label from a thread',
			},
		],
		default: 'add',
		description: '',
	},
];

export const threadLabelFields: INodeProperties[] = [
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'threadLabel',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
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
					'threadLabel',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
	},
];
