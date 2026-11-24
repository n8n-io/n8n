/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as block from './actions/block/Block.resource';
import * as database from './actions/database/Database.resource';
import * as databasePage from './actions/databasePage/DatabasePage.resource';
import * as dataSource from './actions/dataSource/DataSource.resource';
import * as page from './actions/page/Page.resource';
import * as user from './actions/user/User.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Notion',
	name: 'notion',
	icon: { light: 'file:notion.svg', dark: 'file:notion.dark.svg' },
	group: ['output'],
	version: 3,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Notion API',
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
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			name: 'notionOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
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
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'apiKey',
		},
		{
			displayName:
				'In Notion, make sure to <a href="https://www.notion.com/help/add-and-manage-connections-with-the-api" target="_blank">add your connection</a> to the pages you want to access.',
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
					name: 'Data Source',
					value: 'dataSource',
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
		...block.description,
		...dataSource.description,
		...database.description,
		...databasePage.description,
		...page.description,
		...user.description,
	],
};
