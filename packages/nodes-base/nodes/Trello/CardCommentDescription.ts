import { INodeProperties } from 'n8n-workflow';

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
		displayName: 'Card ID',
		name: 'cardIdCommentRLC',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				hint: 'Select a card from the list',
				placeholder: 'Choose...',
				typeOptions: {
					searchListMethod: 'searchCards',
					searchFilterRequired: true,
					searchable: true,
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				hint: 'Enter Card URL',
				placeholder: 'https://trello.com/c/e123456/card-name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://trello.com/c/([a-zA-Z0-9]{2,})/.*',
							errorMessage:
								'URL has to be in the format: http(s)://trello.com/c/[card ID]/.*',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://trello.com/c/([a-zA-Z0-9]{2,})',
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'Enter Card Id',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Id value must be alphanumeric and at least 2 characters',
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
				'@version': [2],
			},
		},
		description: 'The ID of the card',
	},

	// ----------------------------------
	//         cardComment:create
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['cardComment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card',
	},
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
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['cardComment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card',
	},
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
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['cardComment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card to update',
	},
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
