/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as channel from './channel';
import * as channelMessage from './channelMessage';
import * as chatMessage from './chatMessage';
import * as task from './task';

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
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'microsoftTeamsOAuth2Api',
			required: true,
		},
	],
	properties: [
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
