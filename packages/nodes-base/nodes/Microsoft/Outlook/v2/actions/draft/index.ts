import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Delete an email draft',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an email draft',
				action: 'Get a draft',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send an existing email draft',
				action: 'Send a draft',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an email draft',
				action: 'Update a draft',
			},
		],
		default: 'create',
	},

	...create.description,
	...del.description,
	...get.description,
	...send.description,
	...update.description,
];
