/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as database from './database/Database.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Postgres',
	name: 'postgres',
	icon: 'file:postgres.svg',
	group: ['input'],
	// Skip v2.7 and v2.8 to align the backport with changes in n8n v2
	version: [2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9],
	subtitle: '={{ $parameter["operation"] }}',
	description: 'Get, add and update data in Postgres',
	defaults: {
		name: 'Postgres',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'postgres',
			required: true,
			testedBy: 'postgresConnectionTest',
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
