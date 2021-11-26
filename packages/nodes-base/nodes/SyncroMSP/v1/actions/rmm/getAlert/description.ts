import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetAlertsDescription: RmmProperties = [
	{
		displayName: 'RMM Alert Id',
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
		description: 'get specific rmm alert by id',
	},
];
