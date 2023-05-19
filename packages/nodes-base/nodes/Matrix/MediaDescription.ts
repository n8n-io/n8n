import type { INodeProperties } from 'n8n-workflow';

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['media'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Send media to a chat room',
				action: 'Upload media to a chatroom',
			},
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               media:upload                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room Name or ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['upload'],
			},
		},
		description:
			'Room ID to post. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		required: true,
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Media Type',
		name: 'mediaType',
		type: 'options',
		default: 'image',
		displayOptions: {
			show: {
				resource: ['media'],
				operation: ['upload'],
			},
		},
		options: [
			{
				name: 'File',
				value: 'file',
				description: 'General file',
			},
			{
				name: 'Image',
				value: 'image',
				description: 'Image media type',
			},
		],
		description: 'Name of the uploaded file',
		placeholder: 'mxc://matrix.org/uploaded-media-uri',
		required: true,
	},
];
