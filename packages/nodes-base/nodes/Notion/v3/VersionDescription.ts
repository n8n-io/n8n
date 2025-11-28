/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { blockFields, blockOperations } from '../shared/descriptions/BlockDescription';
import { databaseFields, databaseOperations } from '../shared/descriptions/DatabaseDescription';
import {
	databasePageFields,
	databasePageOperations,
} from '../shared/descriptions/DatabasePageDescription';
import { pageFields, pageOperations } from '../shared/descriptions/PageDescription';
import { userFields, userOperations } from '../shared/descriptions/UserDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Notion',
	name: 'notion',
	icon: { light: 'file:notion.svg', dark: 'file:notion.dark.svg' },
	group: ['output'],
	version: 3,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Notion API (v2025-09-03 with multi-source database support)',
	defaults: {
		name: 'Notion',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'notionApi',
			required: true,
		},
	],
	properties: [
		{
			displayName:
				'This version (v3) uses Notion API version 2025-09-03 which supports multi-source databases. This is a breaking change from v2.x. <a href="https://developers.notion.com/docs/upgrade-guide-2025-09-03" target="_blank">Learn more</a>',
			name: 'notionApiVersionNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName:
				'In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access.',
			name: 'notionNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: '',
			name: 'Credentials',
			type: 'credentials',
			default: '',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Block',
					value: 'block',
				},
				{
					name: 'Database',
					value: 'database',
				},
				{
					name: 'Database Page',
					value: 'databasePage',
				},
				{
					name: 'Page',
					value: 'page',
				},
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'page',
		},
		...blockOperations,
		...blockFields,
		...databaseOperations,
		...databaseFields,
		...databasePageOperations,
		...databasePageFields,
		...pageOperations,
		...pageFields,
		...userOperations,
		...userFields,
	],
};
