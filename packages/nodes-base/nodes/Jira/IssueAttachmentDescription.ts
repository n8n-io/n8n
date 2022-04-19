import {
	INodeProperties,
} from 'n8n-workflow';

export const issueAttachmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add attachment to issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an attachment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all attachments',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove an attachment',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const issueAttachmentFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                issueAttachment:add                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'add',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Binary Property',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'add',
				],
			},
		},
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		description: 'Object property name which holds binary data.',
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                issueAttachment:get                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the attachment.',
	},
	{
		displayName: 'Download',
		name: 'download',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'get',
				],
				download: [
					true,
				],
			},
		},
		description: 'Object property name which holds binary data.',
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                issueAttachment:getAll                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Download',
		name: 'download',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'getAll',
				],
				download: [
					true,
				],
			},
		},
		description: 'Object property name which holds binary data.',
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                issueAttachment:remove                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issueAttachment',
				],
				operation: [
					'remove',
				],
			},
		},
		default: '',
		description: 'The ID of the attachment.',
	},
];