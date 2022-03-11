import {
	INodeProperties,
} from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
	// ----------------------------------
	//         attachment
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new attachment for a card',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of an attachment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all attachments for the card',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

];

export const attachmentFields: INodeProperties[] = [

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
				operation: [
					'create',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the card to add attachment to.',
	},
	{
		displayName: 'Source URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The URL of the attachment to add.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'attachment',
				],
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
				description: 'The MIME type of the attachment to add.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the attachment to add.',
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
				operation: [
					'delete',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the card that attachment belongs to.',
	},
	{
		displayName: 'Attachment ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the attachment to delete.',
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
				operation: [
					'getAll',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the card to get attachments.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'attachment',
				],
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
				operation: [
					'get',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the card to get attachment.',
	},
	{
		displayName: 'Attachment ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'attachment',
				],
			},
		},
		description: 'The ID of the attachment to get.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'attachment',
				],
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
