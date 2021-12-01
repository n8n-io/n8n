import {
	RmmProperties,
} from '../../Interfaces';

export const rmmDeleteDescription: RmmProperties = [
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
					'delete',
				],
			},
		},
		default: '',
		description: 'Delete alert by ID',
	},
];
