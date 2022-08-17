import { RmmProperties } from '../../Interfaces';

export const rmmGetDescription: RmmProperties = [
	{
		displayName: 'RMM Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rmm'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Get specific RMM alert by ID',
	},
];
