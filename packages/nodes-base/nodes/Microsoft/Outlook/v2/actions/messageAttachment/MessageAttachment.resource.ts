import type { INodeProperties } from 'n8n-workflow';
import * as add from './add.operation';
import * as download from './download.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';

export { add, download, get, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add an attachment to a message',
				action: 'Add an attachment',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download an attachment from a message',
				action: 'Download an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve information about an attachment of a message',
				action: 'Get an attachment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve information about the attachments of a message',
				action: 'Get many attachments',
			},
		],
		default: 'add',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['add', 'download', 'get', 'getAll'],
			},
		},
	},
	{
		displayName: 'Attachment Name or ID',
		name: 'attachmentId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getMessageAttachments',
			loadOptionsDependsOn: ['messageId'],
		},
		default: '',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['get', 'download'],
			},
		},
	},

	...add.description,
	...download.description,
	...get.description,
	...getAll.description,
];
