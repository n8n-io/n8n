/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { databaseFields, databaseOperations } from '../DatabaseDescription';

import { userFields, userOperations } from '../UserDescription';

import { pageFields, pageOperations } from '../PageDescription';

import { blockFields, blockOperations } from '../BlockDescription';

import { databasePageFields, databasePageOperations } from '../DatabasePageDescription';

import { INodeTypeDescription } from 'n8n-workflow';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Notion',
	name: 'notion',
	icon: 'file:notion.svg',
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Notion API',
	defaults: {
		name: 'Notion (Beta)',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'notionApi',
			required: true,
			// displayOptions: {
			// 	show: {
			// 		authentication: [
			// 			'apiKey',
			// 		],
			// 	},
			// },
		},
		// {
		// 	name: 'notionOAuth2Api',
		// 	required: true,
		// 	displayOptions: {
		// 		show: {
		// 			authentication: [
		// 				'oAuth2',
		// 			],
		// 		},
		// 	},
		// },
	],
	properties: [
		// {
		// 	displayName: 'Authentication',
		// 	name: 'authentication',
		// 	type: 'options',
		// 	options: [
		// 		{
		// 			name: 'API Key',
		// 			value: 'apiKey',
		// 		},
		// 		{
		// 			name: 'OAuth2',
		// 			value: 'oAuth2',
		// 		},
		// 	],
		// 	default: 'apiKey',
		// 	description: 'The resource to operate on.',
		// },
		{
			displayName:
				'In Notion, make sure to <a href="https://www.notion.so/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access.',
			name: 'notionNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Version',
			name: 'version',
			type: 'hidden',
			default: 2,
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
