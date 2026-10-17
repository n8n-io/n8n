import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteIssueRelation from './delete.operation';
import * as getAll from './getAll.operation';

export { create, deleteIssueRelation as delete, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['issueRelation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue relation',
				action: 'Create an issue relation',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue relation',
				action: 'Delete an issue relation',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many issue relations',
				action: 'Get many issue relations',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteIssueRelation.description,
	...getAll.description,
];
