import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as getAllReplies from './getAllReplies.operation';
import * as reply from './reply.operation';
import * as softDeleteMessage from './softDeleteMessage.operation';
import * as undoSoftDeleteMessage from './undoSoftDeleteMessage.operation';
import { SERVICE_PRINCIPAL_AUTH } from '../../transport';

export { create, get, getAll, getAllReplies, reply, softDeleteMessage, undoSoftDeleteMessage };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channelMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message in a channel',
				action: 'Create message',
			},
			{
				name: 'Delete',
				value: 'softDeleteMessage',
				description: 'Delete a message from a channel',
				action: 'Delete message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message from a channel',
				action: 'Get message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages from a channel',
				action: 'Get many messages',
			},
			{
				name: 'Get Many Replies',
				value: 'getAllReplies',
				description: 'Get many replies to a message in a channel',
				action: 'Get many replies',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to a message in a channel',
				action: 'Reply to message',
			},
			{
				name: 'Undo Delete',
				value: 'undoSoftDeleteMessage',
				description: 'Restore a deleted message in a channel',
				action: 'Undo delete message',
			},
		],
		default: 'create',
	},
	{
		displayName:
			'Sending channel messages is not available with the Service Principal credential (app-only Graph supports only migration import). Use an OAuth2 credential to post messages.',
		name: 'channelMessageCreateServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['channelMessage'],
				operation: ['create', 'reply'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},
	{
		displayName:
			'Reading channel messages with the Service Principal credential uses the metered Microsoft Teams API, which may require billing/eval-model configuration on the tenant.',
		name: 'channelMessageGetAllServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['channelMessage'],
				operation: ['get', 'getAll', 'getAllReplies'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},
	{
		displayName:
			'Deleting and restoring channel messages is not available with the Service Principal credential. Microsoft Graph offers these actions only for a signed-in user; use an OAuth2 credential.',
		name: 'channelMessageDeleteServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['channelMessage'],
				operation: ['softDeleteMessage', 'undoSoftDeleteMessage'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},

	...create.description,
	...get.description,
	...getAll.description,
	...getAllReplies.description,
	...reply.description,
	...softDeleteMessage.description,
	...undoSoftDeleteMessage.description,
];
