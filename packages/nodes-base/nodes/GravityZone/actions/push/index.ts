import type { INodeProperties } from 'n8n-workflow';

import * as getPushEventSettings from './getPushEventSettings.operation';
import * as getPushEventStats from './getPushEventStats.operation';
import * as resetPushEventStats from './resetPushEventStats.operation';
import * as sendTestPushEvent from './sendTestPushEvent.operation';
import * as setPushEventSettings from './setPushEventSettings.operation';

export {
	setPushEventSettings,
	getPushEventSettings,
	sendTestPushEvent,
	getPushEventStats,
	resetPushEventStats,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['push'] } },
		options: [
			{
				name: 'Get Push Event Settings',
				value: 'getPushEventSettings',
				action: 'Get push event configuration',
			},
			{
				name: 'Get Push Event Stats',
				value: 'getPushEventStats',
				action: 'Get push event statistics and errors',
			},
			{
				name: 'Reset Push Event Stats',
				value: 'resetPushEventStats',
				action: 'Reset push event statistics and errors',
			},
			{
				name: 'Send Test Push Event',
				value: 'sendTestPushEvent',
				action: 'Send a test push event',
			},
			{
				name: 'Set Push Event Settings',
				value: 'setPushEventSettings',
				action: 'Configure push event settings',
			},
		],
		default: 'getPushEventSettings',
	},
	...setPushEventSettings.description,
	...getPushEventSettings.description,
	...sendTestPushEvent.description,
	...getPushEventStats.description,
	...resetPushEventStats.description,
];
