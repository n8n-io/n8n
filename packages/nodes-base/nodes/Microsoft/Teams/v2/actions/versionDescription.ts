/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chatMember from './chatMember';
import * as chatMessage from './chatMessage';
import * as onlineMeeting from './onlineMeeting';
import * as task from './task';
import { sendAndWaitWebhooksDescription } from '../../../../../utils/sendAndWait/descriptions';
import { SEND_AND_WAIT_WAITING_TOOLTIP } from '../../../../../utils/sendAndWait/utils';
import { SERVICE_PRINCIPAL_AUTH } from '../transport';

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
		{
			name: SERVICE_PRINCIPAL_AUTH,
			required: true,
			displayOptions: {
				show: {
					authentication: [SERVICE_PRINCIPAL_AUTH],
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
						'Generic Microsoft Graph credential. Add the Teams Graph scopes (e.g. Chat.ReadWrite, ChannelMessage.Read.All, Group.ReadWrite.All, OnlineMeetings.ReadWrite, User.Read.All) and grant admin consent on the credential. See the docs for the full scope string.',
				},
				{
					name: 'Service Principal (App-Only)',
					value: SERVICE_PRINCIPAL_AUTH,
					description:
						'App-only access via a Microsoft Entra app registration. App-only Graph cannot act as a signed-in user, so chat actions, chat triggers, and online meetings are unavailable. Grant the relevant application permissions (e.g. Team.ReadBasic.All, Channel.ReadBasic.All, Tasks.ReadWrite.All) and admin consent on the credential.',
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
					name: 'Chat Member',
					value: 'chatMember',
				},
				{
					name: 'Chat Message',
					value: 'chatMessage',
				},
				{
					name: 'Online Meeting',
					value: 'onlineMeeting',
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
		...chatMember.description,
		...chatMessage.description,
		...onlineMeeting.description,
		...task.description,
	],
};
