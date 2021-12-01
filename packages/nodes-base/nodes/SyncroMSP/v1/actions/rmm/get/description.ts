import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetDescription: RmmProperties = [
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
					'get',
				],
			},
		},
		default: '',
		description: 'Get specific rmm alert by ID',
	},
];
