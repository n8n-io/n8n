import {
	INodeProperties,
} from 'n8n-workflow';

export const customerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Search',
				value: 'search',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
	},
] as INodeProperties[];

export const customerFields = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to retrieve',
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
	},
	{
		displayName: 'Select statement',
		name: 'selectStatement',
		type: 'string',
		required: true,
		default: '',
		description: 'The SQL statement to select customers with. See the <a href="https://developer.intuit.com/app/developer/qbo/docs/develop/explore-the-quickbooks-online-api/data-queries" target="_blank">"Search for shared drives"</a> guide for supported syntax.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'search',
				],
			},
		},
	},
] as INodeProperties[];
