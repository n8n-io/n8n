import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as getAll from './getAll.operation';
import * as remove from './remove.operation';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { add, getAll, remove };

export const description: INodeProperties[] = [
	{
		displayName:
			'Chat members are not available with the Service Principal credential. App-only Microsoft Graph has no signed-in user; use an OAuth2 credential for chat actions.',
		name: 'chatMemberServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['chatMember'],
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
				resource: ['chatMember'],
			},
			hide: {
				...SP_HIDE,
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a member to a chat',
				action: 'Add chat member',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many members of a chat',
				action: 'Get many chat members',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a member from a chat',
				action: 'Remove chat member',
			},
		],
		default: 'add',
	},

	...add.description,
	...getAll.description,
	...remove.description,
];
