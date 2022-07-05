import {
	databaseFields,
	databaseOperations,
} from '../DatabaseDescription';

import {
	userFields,
	userOperations,
} from '../UserDescription';

import {
	pageFields,
	pageOperations,
} from '../PageDescription';

import {
	blockFields,
	blockOperations,
} from '../BlockDescription';

import {
	databasePageFields,
	databasePageOperations,
} from '../DatabasePageDescription';

import {
	INodeTypeDescription,
} from 'n8n-workflow';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Notion (Beta)',
	name: 'notion',
	icon: 'file:notion.svg',
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Notion API (Beta)',
	defaults: {
		name: 'Notion',
		color: '#000000',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'notionApi',
			required: true,
			testedBy: 'notionApiCredentialTest',
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
			displayName: 'To access content, make sure it\'s shared with your integration in Notion',
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
