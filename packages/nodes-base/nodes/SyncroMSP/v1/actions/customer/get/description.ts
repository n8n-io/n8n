import {
	CustomerProperties,
} from '../../Interfaces';

export const customerGetDescription: CustomerProperties = [
	{
		displayName: 'Cutomer ID',
		name: 'customerId',
		type: 'string',
		required: true,
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
