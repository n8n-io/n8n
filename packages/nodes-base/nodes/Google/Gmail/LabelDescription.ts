import {
	INodeProperties,
} from 'n8n-workflow';

export const labelOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'label',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a label.',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new label.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a label.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a label by id.',
			}
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const labelFields = [
	{
		displayName: 'Label Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'create',
				]
			},
		},
		placeholder: 'invoices',
		description: 'Label Name',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'add',
					'delete',
				]
			},
		},
		placeholder: '172ce2c4a72cc243',
		description: 'The message ID of your email.',
	},
	{
		displayName: 'Label ID',
		name: 'labelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'label',
				],
				operation: [
					'add',
					'delete',
					'get',
				]
			},
		},
		placeholder: 'Label_14',
		description: 'The ID of the email.',
	},
] as INodeProperties[];
