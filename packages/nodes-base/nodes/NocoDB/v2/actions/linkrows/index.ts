import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

export * as list from './list';
export * as link from './link';
export * as unlink from './unlink';

import * as linkAction from './link';
import * as listAction from './list';
import * as unlinkAction from './unlink';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			resource: ['linkrow'],
		},
	},
	[
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'List',
					value: 'list',
					description: 'List all linked rows from a relational field',
					action: 'Get linked rows',
				},
				{
					name: 'Link',
					value: 'link',
					description: 'Link one or more rows to a relational field',
					action: 'Link a row',
				},
				{
					name: 'Unlink',
					value: 'unlink',
					description: 'Unlink one or more rows from a relational field',
					action: 'Unlink a row',
				},
			],
			default: 'list',
		},

		// ----------------------------------
		//         Shared
		// ----------------------------------
		{
			displayName: 'Workspace Name or ID',
			name: 'workspaceId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getWorkspaces',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'wi0qdp7n',
				},
			],
		},
		{
			displayName: 'Base Name or ID',
			name: 'projectId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsDependsOn: ['workspaceId.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getBases',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'p979g1063032uw4',
				},
			],
		},
		{
			displayName: 'Table Name or ID',
			name: 'table',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description:
				'The table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: {
				loadOptionsDependsOn: ['projectId.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getTables',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'ml0pwy7932yabfg',
				},
			],
		},

		...listAction.description,
		...linkAction.description,
		...unlinkAction.description,
	],
);
