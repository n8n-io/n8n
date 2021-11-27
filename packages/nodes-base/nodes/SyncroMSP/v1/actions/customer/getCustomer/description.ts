import {
	CustomerProperties,
} from '../../Interfaces';

export const customerGetCustomerDescription: CustomerProperties = [
	{
		displayName: 'Cutomer Id',
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
		description: 'get specific customer by id',
	},
];
