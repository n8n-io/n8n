import { INodeProperties } from 'n8n-workflow';
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
				action: 'Add a message attachment',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download attachment content',
				action: 'Download a message attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an attachment from a message',
				action: 'Get a message attachment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: "Get many message's attachments",
				action: 'Get many message attachments',
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

	...add.description,
	...download.description,
	...get.description,
	...getAll.description,
];
