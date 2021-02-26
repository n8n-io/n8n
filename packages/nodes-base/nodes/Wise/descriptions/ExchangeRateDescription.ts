import {
	INodeProperties,
} from 'n8n-workflow';

export const exchangeRateOperations = [
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
		],
		displayOptions: {
			show: {
				resource: [
					'exchangeRate',
				],
			},
		},
	},
] as INodeProperties[];

export const exchangeRateFields = [
	// ----------------------------------
	//         exchangeRate: get
	// ----------------------------------

] as INodeProperties[];
