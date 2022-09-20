import { INodeProperties } from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
	// ----------------------------------
	//         attachment
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new attachment for a card',
				action: 'Create an attachment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an attachment',
				action: 'Delete an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of an attachment',
				action: 'Get an attachment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Returns many attachments for the card',
				action: 'Get many attachments',
			},
		],
		default: 'getAll',
	},
];

export const attachmentFields: INodeProperties[] = [
	{
		displayName: 'Card ID',
		name: 'cardIdAttachmentRLC',
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
				operation: ['delete', 'create', 'get', 'getAll'],
				resource: ['attachment'],
				'@version': [2],
			},
		},
		description: 'The ID of the card',
	},
	// ----------------------------------
	//         attachment:create
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
				resource: ['attachment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card to add attachment to',
	},
	{
		displayName: 'Source URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['attachment'],
			},
		},
		description: 'The URL of the attachment to add',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['attachment'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				default: '',
				placeholder: 'image/png',
				description: 'The MIME type of the attachment to add',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the attachment to add',
			},
		],
	},

	// ----------------------------------
	//         attachment:delete
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
				resource: ['attachment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card that attachment belongs to',
	},
	{
		displayName: 'Attachment ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['attachment'],
			},
		},
		description: 'The ID of the attachment to delete',
	},

	// ----------------------------------
	//         attachment:getAll
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['attachment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card to get attachments',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['attachment'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         attachment:get
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['attachment'],
				'@version': [1],
			},
		},
		description: 'The ID of the card to get attachment',
	},
	{
		displayName: 'Attachment ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['attachment'],
			},
		},
		description: 'The ID of the attachment to get',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['attachment'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},
];
