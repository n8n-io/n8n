import {
	INodeProperties,
} from 'n8n-workflow';

export const commentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
			},
		},
	},
] as INodeProperties[];

export const commentFields = [
	// ----------------------------------
	//         comment: create
	// ----------------------------------
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		default: '',
		description: 'ID of the comment target.',
		placeholder: 't3_15bfi0',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'Text of the comment. Markdown supported.',
		displayOptions: {
			show: {
				resource: [
					'comment',
				],
				operation: [
					'create',
				],
			},
		},
	},
] as INodeProperties[];
