import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as createOrGet from './createOrGet.operation';
import * as deleteMeeting from './deleteMeeting.operation';
import * as get from './get.operation';
import { SERVICE_PRINCIPAL_UNSUPPORTED } from './shared';
import * as update from './update.operation';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { create, createOrGet, deleteMeeting, get, update };

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
				name: 'Create or Get',
				value: 'createOrGet',
				description:
					'Create an online meeting with your own external ID, or get the existing meeting with that ID',
				action: 'Create or get online meeting',
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
			{
				name: 'Update',
				value: 'update',
				description: 'Update an online meeting',
				action: 'Update online meeting',
			},
		],
		default: 'create',
	},

	...create.description,
	...createOrGet.description,
	...deleteMeeting.description,
	...get.description,
	...update.description,
];
