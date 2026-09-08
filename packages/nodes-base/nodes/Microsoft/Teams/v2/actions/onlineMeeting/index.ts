import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteMeeting from './deleteMeeting.operation';
import * as get from './get.operation';
import { SERVICE_PRINCIPAL_UNSUPPORTED } from './shared';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { create, deleteMeeting, get };

export const description: INodeProperties[] = [
	{
		displayName: `Online meetings are not available with the Service Principal credential. ${SERVICE_PRINCIPAL_UNSUPPORTED}`,
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
			{
				name: 'Delete',
				value: 'deleteMeeting',
				description: 'Delete an online meeting',
				action: 'Delete online meeting',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an online meeting by ID or join URL',
				action: 'Get online meeting',
			},
		],
		default: 'create',
	},

	...create.description,
	...deleteMeeting.description,
	...get.description,
];
