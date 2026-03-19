/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { description as rowDescription } from './row/Row.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Supabase',
	name: 'supabase',
	group: ['input'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Add, get, delete and update data in a table via the Supabase Management API',
	defaults: {
		name: 'Supabase',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'supabaseManagementApi',
			required: true,
			displayOptions: {
				show: { authentication: ['pat'] },
			},
		},
		{
			name: 'supabaseManagementOAuth2Api',
			required: true,
			displayOptions: {
				show: { authentication: ['oAuth2'] },
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
				{
					name: 'Personal Access Token',
					value: 'pat',
				},
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Row',
					value: 'row',
				},
			],
			default: 'row',
		},
		...rowDescription,
		{
			displayName: 'Additional Options',
			name: 'additionalOptions',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Schema',
					name: 'schema',
					type: 'string',
					default: 'public',
					description: 'Name of the database schema to use (default: public)',
				},
			],
		},
	],
};
