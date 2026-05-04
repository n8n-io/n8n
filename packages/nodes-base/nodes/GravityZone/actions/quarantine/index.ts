import type { INodeProperties } from 'n8n-workflow';

import * as createAddFileToQuarantineTask from './createAddFileToQuarantineTask.operation';
import * as createEmptyQuarantineTask from './createEmptyQuarantineTask.operation';
import * as createReleaseQuarantineExchangeItemTask from './createReleaseQuarantineExchangeItemTask.operation';
import * as createRemoveQuarantineItemTask from './createRemoveQuarantineItemTask.operation';
import * as createRestoreQuarantineExchangeItemTask from './createRestoreQuarantineExchangeItemTask.operation';
import * as createRestoreQuarantineItemTask from './createRestoreQuarantineItemTask.operation';
import * as getQuarantineItemsList from './getQuarantineItemsList.operation';

export {
	getQuarantineItemsList,
	createRemoveQuarantineItemTask,
	createEmptyQuarantineTask,
	createRestoreQuarantineItemTask,
	createRestoreQuarantineExchangeItemTask,
	createReleaseQuarantineExchangeItemTask,
	createAddFileToQuarantineTask,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: { category: ['quarantine'] } },
		options: [
			{
				name: 'Create Add File to Quarantine Task',
				value: 'createAddFileToQuarantineTask',
				action: 'Create a task to quarantine a file by path',
			},
			{
				name: 'Create Empty Quarantine Task',
				value: 'createEmptyQuarantineTask',
				action: 'Create a task to empty quarantine',
			},
			{
				name: 'Create Release Quarantine Exchange Item Task',
				value: 'createReleaseQuarantineExchangeItemTask',
				action: 'Create a task to release exchange quarantine items to their intended recipients',
			},
			{
				name: 'Create Remove Quarantine Item Task',
				value: 'createRemoveQuarantineItemTask',
				action: 'Create a task to remove quarantine items',
			},
			{
				name: 'Create Restore Quarantine Exchange Item Task',
				value: 'createRestoreQuarantineExchangeItemTask',
				action: 'Create a task to restore exchange quarantine items',
			},
			{
				name: 'Create Restore Quarantine Item Task',
				value: 'createRestoreQuarantineItemTask',
				action: 'Create a task to restore quarantine items',
			},
			{
				name: 'Get Quarantine Items List',
				value: 'getQuarantineItemsList',
				action: 'Get list of quarantine items',
			},
		],
		default: 'getQuarantineItemsList',
	},
	...getQuarantineItemsList.description,
	...createRemoveQuarantineItemTask.description,
	...createEmptyQuarantineTask.description,
	...createRestoreQuarantineItemTask.description,
	...createRestoreQuarantineExchangeItemTask.description,
	...createReleaseQuarantineExchangeItemTask.description,
	...createAddFileToQuarantineTask.description,
];
