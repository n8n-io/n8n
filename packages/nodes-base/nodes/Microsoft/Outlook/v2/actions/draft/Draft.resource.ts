import { INodeProperties } from 'n8n-workflow';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as send from './send.operation';
import * as update from './update.operation';

export { create, del as delete, get, send, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['draft'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new email draft',
				action: 'Create a draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single draft',
				action: 'Get a draft',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send an existing draft message',
				action: 'Send a draft',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft',
				action: 'Update a draft',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Draft Name or ID',
		name: 'draftId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDrafts',
		},
		default: '',
		description:
			'Only return messages from selected folders. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['delete', 'get', 'send', 'update'],
			},
		},
	},

	...create.description,
	...del.description,
	...get.description,
	...send.description,
	...update.description,
];
