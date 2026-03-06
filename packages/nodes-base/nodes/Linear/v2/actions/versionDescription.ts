import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as comment from './comment';
import * as issue from './issue';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Linear',
	name: 'linear',
	icon: 'file:linear.svg',
	group: ['output'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Linear API',
	defaults: {
		name: 'Linear',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'linearApi',
			required: true,
			testedBy: 'linearApiTest',
			displayOptions: {
				show: {
					authentication: ['apiToken'],
				},
			},
		},
		{
			name: 'linearOAuth2Api',
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
					name: 'API Token',
					value: 'apiToken',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'apiToken',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Comment',
					value: 'comment',
				},
				{
					name: 'Issue',
					value: 'issue',
				},
			],
			default: 'issue',
		},
		...comment.description,
		...issue.description,
	],
};
