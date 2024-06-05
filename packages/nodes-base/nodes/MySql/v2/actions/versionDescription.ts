/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as database from './database/Database.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'MySQL',
	name: 'mySql',
	icon: 'file:mysql.svg',
	group: ['input'],
	version: [2, 2.1, 2.2, 2.3, 2.4],
	subtitle: '={{ $parameter["operation"] }}',
	description: 'Get, add and update data in MySQL',
	defaults: {
		name: 'MySQL',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'mySql',
			required: true,
			testedBy: 'mysqlConnectionTest',
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'hidden',
			noDataExpression: true,
			options: [
				{
					name: 'Database',
					value: 'database',
				},
			],
			default: 'database',
		},
		...database.description,
	],
};
