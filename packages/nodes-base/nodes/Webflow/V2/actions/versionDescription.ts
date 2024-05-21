/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as item from './Item/Item.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Webflow',
	name: 'webflow',
	icon: 'file:webflow.svg',
	group: ['transform'],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Webflow API',
	version: [2],
	defaults: {
		name: 'Webflow',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'webflowOAuth2Api',
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
					name: 'OAuth2',
					value: 'oAuth2',
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
					name: 'Item',
					value: 'item',
				},
			],
			default: 'item',
		},
		...item.description,
	],
};
