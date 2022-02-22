import {
	INodeProperties
} from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
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
				name: 'Return invoices',
				value: 'returnInvoices',
				description: 'Returns all invoices associated with a billing setup, for a given month.',
				routing: {
					request: {
						method: 'GET',
						url: '={{"v10/customers/" + $parameter["customerId"] + "/invoices" + "?" + "issueMonth=" + $parameter["issueMonth"] + "&" + "issueYear=" + $parameter["issueYear"] + "&" + "billingSetup=" + $parameter["billingSetupId"] }}',
					},
				},
			},
		],
		default: 'returnInvoices',
		description: 'The operation to perform.',
	},
];

export const invoiceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 invoice:returnInvoices                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
		default: '',
		description: 'The ID of the customer to return invoices for.',
	},
	{
		displayName: 'Billing Setup ID',
		name: 'billingSetupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'returnInvoices',
				],
			},
		},
		default: '',
		description: 'The ID of the billing setup to return invoices for.',
	},
	{
		displayName: 'Issue Year',
		name: 'issueYear',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'returnInvoices',
				],
			},
		},
		default: '',
		description: 'The year of the invoices to return in YYYY format. Only invoices issued in 2019 or later can be retrieved.',
	},
	{
		displayName: 'Issue Month',
		name: 'issueMonth',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'returnInvoices',
				],
			},
		},
		default: '',
		description: 'The month of the invoices to return in enum format see https://developers.google.com/google-ads/api/rest/reference/rest/v10/MonthOfYear',
	},
];



