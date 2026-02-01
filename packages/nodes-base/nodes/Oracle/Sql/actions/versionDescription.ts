/* eslint-disable n8n-nodes-base/node-filename-against-convention */

import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as database from './database/Database.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Oracle Database',
	name: 'oracleDatabase',
	icon: 'file:oracle.svg',
	group: ['input'],
	version: [1],
	subtitle: '={{ $parameter["operation"] }}',
	description: 'Get, add and update data in Oracle database',
	defaults: {
		name: 'Oracle Database',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'oracleDBApi',
			required: true,
			testedBy: 'oracleDBConnectionTest',
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
