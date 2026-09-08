import type { RmmProperties } from '../../Interfaces';

export const rmmDeleteDescription: RmmProperties = [
	{
		displayName: 'RMM alert ID',
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
