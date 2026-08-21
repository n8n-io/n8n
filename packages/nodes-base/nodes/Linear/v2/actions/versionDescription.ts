/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as attachment from './attachment';
import * as comment from './comment';
import * as customer from './customer';
import * as customerNeed from './customerNeed';
import * as cycle from './cycle';
import * as document from './document';
import * as initiative from './initiative';
import * as issue from './issue';
import * as issueRelation from './issueRelation';
import * as label from './label';
import * as project from './project';
import * as projectMilestone from './projectMilestone';
import * as projectUpdate from './projectUpdate';
import * as release from './release';
import * as team from './team';
import * as teamMembership from './teamMembership';
import * as user from './user';
import * as view from './view';
import * as workflowState from './workflowState';

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
					name: 'Attachment',
					value: 'attachment',
				},
				{
					name: 'Comment',
					value: 'comment',
				},
				{
					name: 'Customer',
					value: 'customer',
				},
				{
					name: 'Customer Need',
					value: 'customerNeed',
				},
				{
					name: 'Cycle',
					value: 'cycle',
				},
				{
					name: 'Document',
					value: 'document',
				},
				{
					name: 'Initiative',
					value: 'initiative',
				},
				{
					name: 'Issue',
					value: 'issue',
				},
				{
					name: 'Issue Relation',
					value: 'issueRelation',
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
					name: 'Project Milestone',
					value: 'projectMilestone',
				},
				{
					name: 'Project Update',
					value: 'projectUpdate',
				},
				{
					name: 'Release',
					value: 'release',
				},
				{
					name: 'Team',
					value: 'team',
				},
				{
					name: 'Team Membership',
					value: 'teamMembership',
				},
				{
					name: 'User',
					value: 'user',
				},
				{
					name: 'View',
					value: 'view',
				},
				{
					name: 'Workflow State',
					value: 'workflowState',
				},
			],
			default: 'issue',
		},
		...attachment.description,
		...comment.description,
		...customer.description,
		...customerNeed.description,
		...cycle.description,
		...document.description,
		...initiative.description,
		...issue.description,
		...issueRelation.description,
		...label.description,
		...project.description,
		...projectMilestone.description,
		...projectUpdate.description,
		...release.description,
		...team.description,
		...teamMembership.description,
		...user.description,
		...view.description,
		...workflowState.description,
	],
};
