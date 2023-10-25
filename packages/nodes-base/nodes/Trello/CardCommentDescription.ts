import type { INodeProperties } from 'n8n-workflow';

export const cardCommentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cardComment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a comment on a card',
				action: 'Create a card comment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a comment from a card',
				action: 'Delete a card comment',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment on a card',
				action: 'Update a card comment',
			},
		],
		default: 'create',
	},
];

export const cardCommentFields: INodeProperties[] = [
	{
		displayName: 'Card',
		name: 'cardId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Card...',
				typeOptions: {
					searchListMethod: 'searchCards',
					searchFilterRequired: true,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://trello.com/c/e123456/card-name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://trello.com/c/([a-zA-Z0-9]{2,})/.*',
							errorMessage: 'Not a valid Trello Card URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://trello.com/c/([a-zA-Z0-9]{2,})',
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Trello Card ID',
						},
					},
				],
				placeholder: 'wiIaGwqE',
				url: '=https://trello.com/c/{{$value}}',
			},
		],
		displayOptions: {
			show: {
				operation: ['update', 'delete', 'create'],
				resource: ['cardComment'],
			},
		},
		description: 'The ID of the card',
	},

	// ----------------------------------
	//         cardComment:create
	// ----------------------------------
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['cardComment'],
			},
		},
		description: 'Text of the comment',
	},

	// ----------------------------------
	//         cardComment:remove
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['cardComment'],
			},
		},
		description: 'The ID of the comment to delete',
	},

	// ----------------------------------
	//         cardComment:update
	// ----------------------------------
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['cardComment'],
			},
		},
		description: 'The ID of the comment to delete',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['cardComment'],
			},
		},
		description: 'Text of the comment',
	},
];
