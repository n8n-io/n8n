import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

export * as count from './count.operation';
export * as get from './get.operation';
export * as search from './search.operation';
export * as create from './create.operation';
export * as delete from './delete.operation';
export * as update from './update.operation';
export * as upload from './upload.operation';
export * as upsert from './upsert.operation';

import * as countAction from './count.operation';
import * as createAction from './create.operation';
import * as deleteAction from './delete.operation';
import * as getAction from './get.operation';
import * as searchAction from './search.operation';
import * as updateAction from './update.operation';
import * as uploadAction from './upload.operation';
import * as upsertAction from './upsert.operation';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
		},
	},
	[
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					version: [4],
				},
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new row in a table',
					action: 'Create a row',
				},
				{
					name: 'Create or Update',
					value: 'upsert',
					description:
						'Create a new record, or update the current one if it already exists (upsert)',
					action: 'Create or update a row',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a row in a table',
					action: 'Update a row',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a row from a table',
					action: 'Delete a row',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve a record from a table',
					action: 'Get a row',
				},
				{
					name: 'Search',
					value: 'search',
					description: 'Search for specific records or list all',
					action: 'Search rows',
				},
				{
					name: 'Count',
					value: 'count',
					description: 'Count records in a table',
					action: 'Count rows',
				},
				{
					name: 'Upload Attachment to Cell',
					value: 'upload',
					description: 'Upload attachment(s) to an existing cell in a row',
					action: 'Upload attachment to a row cell',
				},
			],
			default: 'get',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					version: [3],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a row',
					action: 'Create a row',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a row',
					action: 'Delete a row',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve a row',
					action: 'Get a row',
				},
				{
					name: 'Search',
					value: 'search',
					description: 'Search for specific records or list all',
					action: 'Search rows',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a row',
					action: 'Update a row',
				},
			],
			default: 'get',
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

		...countAction.description,
		...getAction.description,
		...searchAction.description,
		...createAction.description,
		...deleteAction.description,
		...updateAction.description,
		...upsertAction.description,
		...uploadAction.description,
	],
);
