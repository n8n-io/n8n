import {
	INodeProperties,
} from 'n8n-workflow';

export const attachmentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
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
				name: 'Get',
				value: 'get',
				description: 'Gets the metadata of a message attachment. The attachment data is fetched using the media API',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  attachmentFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 attachments:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment Name',
		name: 'attachmentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Resource name of the attachment, in the form "spaces/*/messages/*/attachments/*".',
	},

] as INodeProperties[];
