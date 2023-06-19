/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import { alertFields, alertOperations } from './descriptions/AlertDescription';
import { observableFields, observableOperations } from './descriptions/ObservableDescription';
import { caseFields, caseOperations } from './descriptions/CaseDescription';
import { taskFields, taskOperations } from './descriptions/TaskDescription';
import { logFields, logOperations } from './descriptions/LogDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'TheHive',
	name: 'theHive',
	icon: 'file:thehive.svg',
	group: ['transform'],
	subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
	version: 2,
	description: 'Consume TheHive API',
	defaults: {
		name: 'TheHive',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'theHiveApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			required: true,
			options: [
				{
					name: 'Alert',
					value: 'alert',
				},
				{
					name: 'Case',
					value: 'case',
				},
				{
					name: 'Log',
					value: 'log',
				},
				{
					name: 'Observable',
					value: 'observable',
				},
				{
					name: 'Task',
					value: 'task',
				},
			],
			default: 'alert',
		},
		// Alert
		...alertOperations,
		...alertFields,
		// Observable
		...observableOperations,
		...observableFields,
		// Case
		...caseOperations,
		...caseFields,
		// Task
		...taskOperations,
		...taskFields,
		// Log
		...logOperations,
		...logFields,
	],
};
