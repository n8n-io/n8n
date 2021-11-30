import {
	CustomerProperties,
} from '../../Interfaces';

export const customerGetCustomerDescription: CustomerProperties = [
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
					'getCustomer',
				],
			},
		},
		default: '',
		description: 'Get specific customer by ID',
	},
];
