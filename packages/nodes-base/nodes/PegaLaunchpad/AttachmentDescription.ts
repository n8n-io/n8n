import type { INodeProperties } from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete an attachment',
				action: 'Delete an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an attachment',
				action: 'Get an attachment',
			},
			{
				name: 'Link to Case',
				value: 'linkToCase',
				description: 'Link an attachment to a case',
				action: 'Link attachment to case',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file as an attachment',
				action: 'Upload an attachment',
			},
		],
		default: 'get',
	},
];

export const attachmentFields: INodeProperties[] = [
	// ----------------------------------
	//         attachment:get
	// ----------------------------------
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the attachment to retrieve',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//         attachment:delete
	// ----------------------------------
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the attachment to delete',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//         attachment:linkToCase
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the case to link the attachment to',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['linkToCase'],
			},
		},
	},
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the attachment to link to the case',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['linkToCase'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['linkToCase'],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: 'File',
				description: 'The type of the attachment',
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: 'File',
				description: 'The category of the attachment',
			},
		],
	},

	// ----------------------------------
	//         attachment:upload
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the case (context) to attach the file to',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'Name of the binary property which contains the file to upload',
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['attachment'],
				operation: ['upload'],
			},
		},
		options: [
			{
				displayName: 'Append Unique ID to Filename',
				name: 'appendUniqueIdToFileName',
				type: 'boolean',
				default: true,
				description: 'Whether to append a unique ID to the filename to avoid conflicts',
			},
			{
				displayName: 'Link to Case After Upload',
				name: 'linkToCase',
				type: 'boolean',
				default: true,
				description:
					'Whether to automatically link the uploaded attachment to the case. When enabled (default), the upload is followed by a second API call to associate the attachment with the case.',
			},
			{
				displayName: 'Attachment Type',
				name: 'type',
				type: 'string',
				default: 'File',
				description: 'The type of the attachment when linking to the case',
				displayOptions: {
					show: {
						linkToCase: [true],
					},
				},
			},
			{
				displayName: 'Attachment Category',
				name: 'category',
				type: 'string',
				default: 'File',
				description: 'The category of the attachment when linking to the case',
				displayOptions: {
					show: {
						linkToCase: [true],
					},
				},
			},
		],
	},
];
