import {
	INodeProperties,
} from 'n8n-workflow';

export const invoiceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invoice',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const invoiceFields = [

	/* -------------------------------------------------------------------------- */
	/*                                   invoice:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
	},
] as INodeProperties[];
