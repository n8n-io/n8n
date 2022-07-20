import {
	INodeProperties,
} from 'n8n-workflow';

export const threadLabelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Add a thread label',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a thread label',
			},
		],
		default: 'add',
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
		displayName: 'Label ID Names or IDs',
		name: 'labelIds',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getLabels',
		},
		default: [],
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
