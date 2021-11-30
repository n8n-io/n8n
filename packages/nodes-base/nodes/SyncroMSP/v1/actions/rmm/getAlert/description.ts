import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetAlertsDescription: RmmProperties = [
	{
		displayName: 'RMM Alert ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'getAlert',
				],
			},
		},
		default: '',
		description: 'Get specific rmm alert by ID',
	},
];
