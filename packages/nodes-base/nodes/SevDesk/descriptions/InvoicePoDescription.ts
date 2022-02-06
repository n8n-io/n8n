import {
	INodeProperties,
} from 'n8n-workflow';

export const invoicePoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'invoicePo',
				],
			},
		},
		options: [
			{
				name: 'Creates',
				value: 'creates',
				description: 'You can still create invoices positions by using this request, however, this endpoint does not allow the simultaneous creation of an invoice. It only creates the invoice position object!<br> Please use the \'saveInvoice\' endpoint for creating invoices together with positions, discounts, etc., in one request.<br> Support for users integrating with this endpoint may be limited.',
			},
		],
		default: 'creates',
	},
];

export const invoicePoFields: INodeProperties[] = [
	{
		displayName: 'Required Fields',
		name: 'requiredFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoicePo',
				],
				operation: [
					'creates',
				],
			},
		},
		options: [
		],
	},
];
