import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { serpexSearch } from './GenericFunctions';

export class Serpex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Serpex',
		name: 'serpex',
		icon: 'file:serpex.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Multi-engine web search using Serpex API',
		defaults: {
			name: 'Serpex',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'serpexApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search the web using Serpex',
						action: 'Search the web',
					},
				],
				default: 'search',
			},

			// ----------------------------------
			//         Search Parameters
			// ----------------------------------
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				default: '',
				placeholder: 'e.g., latest AI news',
				description: 'The search query',
			},
			{
				displayName: 'Search Engine',
				name: 'engine',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'Auto (Best Available)',
						value: 'auto',
						description: 'Automatically selects the best available engine',
					},
					{
						name: 'Google',
						value: 'google',
					},
					{
						name: 'Bing',
						value: 'bing',
					},
					{
						name: 'DuckDuckGo',
						value: 'duckduckgo',
					},
					{
						name: 'Brave',
						value: 'brave',
					},
					{
						name: 'Yahoo',
						value: 'yahoo',
					},
					{
						name: 'Yandex',
						value: 'yandex',
					},
				],
				default: 'auto',
				description: 'The search engine to use',
			},
			{
				displayName: 'Time Range',
				name: 'timeRange',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['search'],
					},
				},
				options: [
					{
						name: 'All Time',
						value: 'all',
					},
					{
						name: 'Last Day',
						value: 'day',
					},
					{
						name: 'Last Week',
						value: 'week',
					},
					{
						name: 'Last Month',
						value: 'month',
					},
					{
						name: 'Last Year',
						value: 'year',
					},
				],
				default: 'all',
				description: 'Filter results by time range',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'search') {
					const searchQuery = this.getNodeParameter('searchQuery', i) as string;
					const engine = this.getNodeParameter('engine', i) as string;
					const timeRange = this.getNodeParameter('timeRange', i) as string;

					const response = await serpexSearch.call(
						this,
						searchQuery,
						engine,
						timeRange,
						'web',
					);

					returnData.push({
						json: response,
						pairedItem: {
							item: i,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
