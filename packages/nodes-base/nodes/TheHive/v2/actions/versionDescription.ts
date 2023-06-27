/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as alert from './alert';
import * as case_ from './case';
import * as comment from './comment';
import * as log from './log';
import * as observable from './observable';
import * as query from './query';
import * as task from './task';
import * as page from './page';

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
					name: 'Comment',
					value: 'comment',
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
					name: 'Page',
					value: 'page',
				},
				{
					name: 'Query',
					value: 'query',
				},
				{
					name: 'Task',
					value: 'task',
				},
			],
			default: 'alert',
		},

		...alert.description,
		...case_.description,
		...comment.description,
		...log.description,
		...observable.description,
		...page.description,
		...query.description,
		...task.description,
	],
};
