import {
	CustomerProperties,
} from '../../Interfaces';

export const customerDeleteDescription: CustomerProperties = [
	{
		displayName: 'Customer ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'deleteCustomer',
				],
			},
		},
		default: '',
		description: 'Delete a specific customer by ID',
	},
];
