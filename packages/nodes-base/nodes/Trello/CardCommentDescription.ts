import {
	INodeProperties,
} from "n8n-workflow";

export const cardCommentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'cardComment',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a comment to a card',
			},
			{
				name: 'Revove',
				value: 'remove',
				description: 'Remove a comment from a card',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment in a card',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const cardCommentFields = [
	// ----------------------------------
	//         cardComment:add
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The id of the card',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'Text of the comment',
	},

	// ----------------------------------
	//         cardComment:remove
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card.',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'remove',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the comment to delete.',
	},

	// ----------------------------------
	//         cardComment:update
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the card to update.',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'The ID of the comment to delete.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'cardComment',
				],
			},
		},
		description: 'Text of the comment',
	},
] as INodeProperties[];
