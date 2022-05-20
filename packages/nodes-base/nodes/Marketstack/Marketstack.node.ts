import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	endOfDayDataFields,
	endOfDayDataOperations,
	exchangeFields,
	exchangeOperations,
	tickerFields,
	tickerOperations,
} from './descriptions';

import {
	format,
	marketstackApiRequest,
	marketstackApiRequestAllItems,
	validateTimeOptions,
} from './GenericFunctions';

import {
	EndOfDayDataFilters,
	Operation,
	Resource,
} from './types';

export class Marketstack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Marketstack',
		name: 'marketstack',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		icon: 'file:marketstack.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Marketstack API',
		defaults: {
			name: 'Marketstack',
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
				noDataExpression: true,
				options: [
					{
						name: 'End-of-Day Data',
						value: 'endOfDayData',
						description: 'Stock market closing data',
					},
					{
						name: 'Exchange',
						value: 'exchange',
						description: 'Stock market exchange',
					},
					{
						name: 'Ticker',
						value: 'ticker',
						description: 'Stock market symbol',
					},
				],
				default: 'endOfDayData',
				required: true,
			},
			...endOfDayDataOperations,
			...endOfDayDataFields,
			...exchangeOperations,
			...exchangeFields,
			...tickerOperations,
			...tickerFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as Resource;
		const operation = this.getNodeParameter('operation', 0) as Operation;

		let responseData: any; // tslint:disable-line: no-any
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			try {

				if (resource === 'endOfDayData') {

					if (operation === 'getAll') {

						// ----------------------------------
						//       endOfDayData: getAll
						// ----------------------------------

						const qs: IDataObject = {
							symbols: this.getNodeParameter('symbols', i),
						};

						const {
							latest,
							specificDate,
							dateFrom,
							dateTo,
							...rest
						} = this.getNodeParameter('filters', i) as EndOfDayDataFilters;

						validateTimeOptions.call(this, [
							latest !== undefined && latest !== false,
							specificDate !== undefined,
							dateFrom !== undefined && dateTo !== undefined,
						]);

						if (Object.keys(rest).length) {
							Object.assign(qs, rest);
						}

						let endpoint: string;

						if (latest) {
							endpoint = '/eod/latest';
						} else if (specificDate) {
							endpoint = `/eod/${format(specificDate)}`;
						} else {
							if (!dateFrom || !dateTo) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter a start and end date to filter by timeframe.',
								);
							}
							endpoint = '/eod';
							qs.date_from = format(dateFrom);
							qs.date_to = format(dateTo);
						}

						responseData = await marketstackApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

					}

				} else if (resource === 'exchange') {

					if (operation === 'get') {

						// ----------------------------------
						//          exchange: get
						// ----------------------------------

						const exchange = this.getNodeParameter('exchange', i);
						const endpoint = `/exchanges/${exchange}`;

						responseData = await marketstackApiRequest.call(this, 'GET', endpoint);

					}

				} else if (resource === 'ticker') {

					if (operation === 'get') {

						// ----------------------------------
						//           ticker: get
						// ----------------------------------

						const symbol = this.getNodeParameter('symbol', i);
						const endpoint = `/tickers/${symbol}`;

						responseData = await marketstackApiRequest.call(this, 'GET', endpoint);

					}

				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
