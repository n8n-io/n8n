/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as alert from './alert';
import * as case_ from './case';
import * as comment from './comment';
import * as log from './log';
import * as observable from './observable';
import * as page from './page';
import * as query from './query';
import * as task from './task';

export const description: INodeTypeDescription = {
	displayName: 'TheHive 5',
	name: 'theHiveProject',
	icon: 'file:thehiveproject.svg',
	group: ['transform'],
	subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
	version: 1,
	description: 'Consume TheHive 5 API',
	defaults: {
		name: 'TheHive 5',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'theHiveProjectApi',
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
				{
					name: 'Task Log',
					value: 'log',
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
