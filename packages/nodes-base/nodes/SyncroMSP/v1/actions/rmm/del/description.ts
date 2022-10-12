import { RmmProperties } from '../../Interfaces';

export const rmmDeleteDescription: RmmProperties = [
	{
		displayName: 'RMM Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rmm'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Delete the RMM alert by ID',
	},
];
