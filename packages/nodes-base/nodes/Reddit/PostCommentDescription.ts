import {
	INodeProperties,
} from 'n8n-workflow';

export const postCommentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		description: 'Operation to perform',
		options: [
			{
				name: 'Add',
				value: 'add',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Remove',
				value: 'remove',
			},
			{
				name: 'Reply',
				value: 'reply',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'postComment',
				],
			},
		},
	},
] as INodeProperties[];

export const postCommentFields = [
	// ----------------------------------
	//        postComment: add
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
					'postComment',
				],
				operation: [
					'add',
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
					'postComment',
				],
				operation: [
					'add',
				],
			},
		},
	},
] as INodeProperties[];
