import type { INodeProperties } from 'n8n-workflow';

import * as send from './send.operation';
import { ACTIVITY_NOTIFICATION_SETUP_URL } from '../../transport/forbiddenHints';

export { send };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activityNotification'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a notification to the activity feed of a user',
				action: 'Send an activity notification',
			},
		],
		default: 'send',
	},
	{
		displayName: `Teams shows this notification only when a companion Teams app is installed for the recipient. The app manifest must name this credential's client ID under webApplicationInfo. The app registration must have the TeamsActivity.Send permission. A Teams admin sets this up once. <a href="${ACTIVITY_NOTIFICATION_SETUP_URL}" target="_blank">Learn more</a>.`,
		name: 'activityNotificationSetupNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['activityNotification'],
			},
		},
	},
	...send.description,
];
