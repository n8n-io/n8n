import {
	RmmProperties,
} from '../../Interfaces';

export const rmmDeleteAlertDescription: RmmProperties = [
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
					'deleteAlert',
				],
			},
		},
		default: '',
		description: 'Delete alert by id',
	},
];
