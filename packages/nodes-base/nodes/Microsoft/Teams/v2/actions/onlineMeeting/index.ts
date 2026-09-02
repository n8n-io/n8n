import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { create };

export const description: INodeProperties[] = [
	{
		displayName:
			'Online meetings are not available with the Service Principal credential. Online meeting operations run on the signed-in user (/me); use an OAuth2 credential instead.',
		name: 'onlineMeetingServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['onlineMeeting'],
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
				resource: ['onlineMeeting'],
			},
			hide: {
				...SP_HIDE,
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an online meeting',
				action: 'Create online meeting',
			},
		],
		default: 'create',
	},

	...create.description,
];
