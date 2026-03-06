import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as comment from './comment';
import * as issue from './issue';
import * as label from './label';
import * as project from './project';
import * as team from './team';
import * as user from './user';

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
				{
					name: 'Label',
					value: 'label',
				},
				{
					name: 'Project',
					value: 'project',
				},
				{
					name: 'Team',
					value: 'team',
				},
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'issue',
		},
		...comment.description,
		...issue.description,
		...label.description,
		...project.description,
		...team.description,
		...user.description,
	],
};
