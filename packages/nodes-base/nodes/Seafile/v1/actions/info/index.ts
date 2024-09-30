import * as account from './account.operation';
import * as server from './server.operation';
import * as file_activity from './file_activity.operation';

import type { INodeProperties } from 'n8n-workflow';

export { account, server, file_activity };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['info'],
			},
		},
		options: [
			{
				name: 'Account',
				value: 'account',
				description: 'Show the account details',
				action: 'Get account details',
			},
			{
				name: 'File Activity',
				value: 'file_activity',
				description: 'Return all file activities of the user',
				action: 'Get file activity',
			},
			{
				name: 'Server',
				value: 'server',
				description: 'Show details about this Seafile server',
				action: 'Get server details',
			},
		],
		default: 'file_activity',
	},
	...account.description,
	...server.description,
	...file_activity.description,
];
