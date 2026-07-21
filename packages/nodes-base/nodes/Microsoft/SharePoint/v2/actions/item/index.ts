import type { INodeProperties } from 'n8n-workflow';

// `delete` is reserved, so import under the `del` alias and re-export (as v1 does).
import * as del from './delete.operation';
import * as get from './get.operation';

export { get, del as delete };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of a single item',
				action: 'Get item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete item',
			},
		],
		default: 'get',
	},

	...get.description,
	...del.description,
];
