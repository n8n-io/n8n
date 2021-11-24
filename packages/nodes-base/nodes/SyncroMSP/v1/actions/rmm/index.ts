
import * as getAlerts from './getAlerts';

import { INodeProperties } from 'n8n-workflow';

export {
	getAlerts,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
			},
		},
		options: [
			{
				name: 'Get RMM Alerts',
				value: 'getAlerts',
				description: 'Retrieve RMM Alerts',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAlerts.description,
] as INodeProperties[];

