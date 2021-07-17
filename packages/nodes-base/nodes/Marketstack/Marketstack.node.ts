import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class Marketstack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Marketstack',
		name: 'marketstack',
		icon: 'file:marketstack.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Marketstack API',
		defaults: {
			name: 'Marketstack',
			color: '#02283e',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'marketstackApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Stock market data',
						value: 'stockmarket',
					},
				],
				default: 'stockmarket',
				required: true,
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'stockmarket',
						],
					},
				},
				options: [
					{
						name: 'End-of-day',
						value: 'eod',
						description: 'Data at closing of the market',
					},
				],
				default: 'eod',
				description: 'Type of data',
			},
			{
				displayName: 'Stock',
				name: 'stock',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'stockmarket',
						],
					},
				},
				default: '',
				description: 'Ticker symbol, including exchange suffix where necessary',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = this.getCredentials('marketstackApi') as IDataObject;

		if (resource === 'stockmarket') {
			const symbols: string[] = [];

			for (let i = 0; i < items.length; i++) {
				symbols.push(this.getNodeParameter('stock', i) as string);
			}

			if (operation === 'eod') {
				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
					},
					method: 'GET',
					uri: `http://api.marketstack.com/v1/eod/latest`,
					qs: {
						access_key: credentials.apiKey,
						symbols: symbols.join(','),
					},
					json: true,
				};
	
				responseData = await this.helpers.request(options);
				responseData = responseData.data;
			}
		}
	
		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}
}
