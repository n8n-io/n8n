import {
	INodeProperties,
} from 'n8n-workflow';

export const exchangeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
		displayOptions: {
			show: {
				resource: [
					'exchange',
				],
			},
		},
	},
];

export const exchangeFields: INodeProperties[] = [
	{
		displayName: 'Exchange',
		name: 'exchange',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'exchange',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Stock exchange to retrieve, specified by <a href="https://en.wikipedia.org/wiki/Market_Identifier_Code">Market Identifier Code</a>, e.g. <code>XNAS</code>',
	},
];
