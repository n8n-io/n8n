import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { get, getAll };

export const description: INodeProperties[] = [
	{
		displayName:
			'Chats are not available with the Service Principal credential. App-only Microsoft Graph has no signed-in user to read or create chats for; use an OAuth2 credential for chat actions.',
		name: 'chatServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['chat'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
			hide: {
				...SP_HIDE,
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a chat',
				action: 'Get chat',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many chats',
				action: 'Get many chats',
			},
		],
		default: 'getAll',
	},

	...get.description,
	...getAll.description,
];
