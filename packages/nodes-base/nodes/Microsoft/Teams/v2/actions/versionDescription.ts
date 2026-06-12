/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chatMessage from './chatMessage';
import * as task from './task';
import { sendAndWaitWebhooksDescription } from '../../../../../utils/sendAndWait/descriptions';
import { SEND_AND_WAIT_WAITING_TOOLTIP } from '../../../../../utils/sendAndWait/utils';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft Teams',
	name: 'microsoftTeams',
	icon: 'file:teams.svg',
	group: ['input'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Microsoft Teams API',
	defaults: {
		name: 'Microsoft Teams',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'microsoftTeamsOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			name: 'microsoftTeamsServicePrincipalApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['servicePrincipal'],
				},
			},
		},
	],
	waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
	webhooks: sendAndWaitWebhooksDescription,
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'OAuth2 (Delegated)',
					value: 'oAuth2',
				},
				{
					name: 'Service Principal (Application)',
					value: 'servicePrincipal',
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
					name: 'Channel',
					value: 'channel',
				},
				{
					name: 'Channel Message',
					value: 'channelMessage',
				},
				{
					name: 'Chat Message',
					value: 'chatMessage',
				},
				{
					name: 'Task',
					value: 'task',
				},
			],
			default: 'channel',
		},

		...channel.description,
		...channelMessage.description,
		...chatMessage.description,
		...task.description,
	],
};
