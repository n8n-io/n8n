/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { itemFields, itemOperations } from './item/ItemDescription';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Monday.com',
	name: 'mondayCom',
	icon: { light: 'file:mondayCom.svg', dark: 'file:mondayCom.dark.svg' },
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Monday.com API',
	defaults: {
		name: 'Monday.com',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'mondayComApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['accessToken'],
				},
			},
		},
		{
			name: 'mondayComOAuth2Api',
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
					name: 'Access Token',
					value: 'accessToken',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'accessToken',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [{ name: 'Item', value: 'item' }],
			default: 'item',
		},
		...itemOperations,
		...itemFields,
	],
};
