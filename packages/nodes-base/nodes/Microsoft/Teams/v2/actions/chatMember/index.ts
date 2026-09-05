import type { INodeProperties } from 'n8n-workflow';

import * as getAll from './getAll.operation';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { getAll };

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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many members of a chat',
				action: 'Get many chat members',
			},
		],
		default: 'getAll',
	},

	...getAll.description,
];
