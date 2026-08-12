import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as getAll from './getAll.operation';
import { SERVICE_PRINCIPAL_AUTH } from '../../transport';

export { create, getAll };

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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages from a channel',
				action: 'Get many messages',
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
				operation: ['create'],
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
				operation: ['getAll'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},

	...create.description,
	...getAll.description,
];
