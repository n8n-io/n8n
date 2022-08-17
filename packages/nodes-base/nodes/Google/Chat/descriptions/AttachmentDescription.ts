import { INodeProperties } from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['attachment'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Gets the metadata of a message attachment. The attachment data is fetched using the media API.',
				action: 'Get an attachment',
			},
		],
		default: 'get',
	},
];

export const attachmentFields: INodeProperties[] = [
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
				resource: ['attachment'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Resource name of the attachment, in the form "spaces/*/messages/*/attachments/*"',
	},
];
