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
					authentication: ['microsoftTeamsOAuth2Api'],
				},
			},
		},
		{
			name: 'microsoftOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['microsoftOAuth2Api'],
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
			noDataExpression: true,
			options: [
				{
					name: 'Teams OAuth2',
					value: 'microsoftTeamsOAuth2Api',
				},
				{
					name: 'Microsoft OAuth2 (Graph)',
					value: 'microsoftOAuth2Api',
					description:
						'Generic Microsoft Graph credential. Add the Teams Graph scopes (e.g. Chat.ReadWrite, ChannelMessage.Read.All, Group.ReadWrite.All) and grant admin consent on the credential. See the docs for the full scope string.',
				},
			],
			default: 'microsoftTeamsOAuth2Api',
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
