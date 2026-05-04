import type { INodeProperties } from 'n8n-workflow';

import * as addToBlocklist from './addToBlocklist.operation';
import * as changeIncidentStatus from './changeIncidentStatus.operation';
import * as createCustomRule from './createCustomRule.operation';
import * as createIsolateEndpointTask from './createIsolateEndpointTask.operation';
import * as createResponseAction from './createResponseAction.operation';
import * as createRestoreEndpointFromIsolationTask from './createRestoreEndpointFromIsolationTask.operation';
import * as deleteCustomRule from './deleteCustomRule.operation';
import * as getBlocklistItems from './getBlocklistItems.operation';
import * as getCustomRulesList from './getCustomRulesList.operation';
import * as getResponseActionStatus from './getResponseActionStatus.operation';
import * as getSimilarEmails from './getSimilarEmails.operation';
import * as removeFromBlocklist from './removeFromBlocklist.operation';
import * as updateCustomRule from './updateCustomRule.operation';
import * as updateIncidentNote from './updateIncidentNote.operation';

export {
	addToBlocklist,
	changeIncidentStatus,
	createCustomRule,
	createIsolateEndpointTask,
	createResponseAction,
	createRestoreEndpointFromIsolationTask,
	deleteCustomRule,
	getBlocklistItems,
	getCustomRulesList,
	getResponseActionStatus,
	getSimilarEmails,
	removeFromBlocklist,
	updateCustomRule,
	updateIncidentNote,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getCustomRulesList',
		displayOptions: {
			show: { category: ['incidents'] },
		},
		options: [
			{
				name: 'Add to Blocklist',
				value: 'addToBlocklist',
				action: 'Add rules to the blocklist',
			},
			{
				name: 'Change Incident Status',
				value: 'changeIncidentStatus',
				action: 'Change the status of an incident',
			},
			{
				name: 'Create Custom Rule',
				value: 'createCustomRule',
				action: 'Create a custom rule',
			},
			{
				name: 'Create Isolate Endpoint Task',
				value: 'createIsolateEndpointTask',
				action: 'Create a task to isolate an endpoint',
			},
			{
				name: 'Create Response Action',
				value: 'createResponseAction',
				action: 'Create a response action for an incident',
			},
			{
				name: 'Create Restore Endpoint From Isolation Task',
				value: 'createRestoreEndpointFromIsolationTask',
				action: 'Create a task to restore an endpoint from isolation',
			},
			{
				name: 'Delete Custom Rule',
				value: 'deleteCustomRule',
				action: 'Delete a custom rule',
			},
			{
				name: 'Get Blocklist Items',
				value: 'getBlocklistItems',
				action: 'List existing blocklist items',
			},
			{
				name: 'Get Custom Rules List',
				value: 'getCustomRulesList',
				action: 'List existing custom rules',
			},
			{
				name: 'Get Response Action Status',
				value: 'getResponseActionStatus',
				action: 'Get the status of a response action',
			},
			{
				name: 'Get Similar Emails',
				value: 'getSimilarEmails',
				action: 'Retrieve emails similar to a given email',
			},
			{
				name: 'Remove From Blocklist',
				value: 'removeFromBlocklist',
				action: 'Remove entries from the blocklist',
			},
			{
				name: 'Update Custom Rule',
				value: 'updateCustomRule',
				action: 'Edit a custom exclusion or detection rule',
			},
			{
				name: 'Update Incident Note',
				value: 'updateIncidentNote',
				action: 'Assign a note to an incident',
			},
		],
	},
	...addToBlocklist.description,
	...changeIncidentStatus.description,
	...createCustomRule.description,
	...createIsolateEndpointTask.description,
	...createResponseAction.description,
	...createRestoreEndpointFromIsolationTask.description,
	...deleteCustomRule.description,
	...getBlocklistItems.description,
	...getCustomRulesList.description,
	...getResponseActionStatus.description,
	...getSimilarEmails.description,
	...removeFromBlocklist.description,
	...updateCustomRule.description,
	...updateIncidentNote.description,
];
