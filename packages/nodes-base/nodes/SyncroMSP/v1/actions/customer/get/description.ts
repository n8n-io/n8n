import {
	CustomerProperties,
} from '../../Interfaces';

export const customerGetDescription: CustomerProperties = [
	{
		displayName: 'Cutomer ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Get specific customer by ID',
	},
];
