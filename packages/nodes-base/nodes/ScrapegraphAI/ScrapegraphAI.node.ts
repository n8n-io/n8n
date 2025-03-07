import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { smartscraperFields, smartscraperOperations } from './SmartscraperDescription';
import { searchscraperFields, searchscraperOperations } from './SearchscraperDescription';
import { markdownifyFields, markdownifyOperations } from './MarkdownifyDescription';

export class ScrapegraphAI implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ScrapegraphAI',
		name: 'scrapegraphAI',
		icon: 'file:scrapegraphAI.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ScrapegraphAI API',
		defaults: {
			name: 'ScrapegraphAI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'scrapegraphAIApi',
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
						name: 'Smart Scraper',
						value: 'smartscraper',
					},
					{
						name: 'Search Scraper',
						value: 'searchscraper',
					},
					{
						name: 'Markdownify',
						value: 'markdownify',
					},
				],
				default: 'smartscraper',
			},
			...smartscraperOperations,
			...smartscraperFields,
			...searchscraperOperations,
			...searchscraperFields,
			...markdownifyOperations,
			...markdownifyFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		
		const credentials = await this.getCredentials('scrapegraphAIApi');
		const baseUrl = 'https://api.scrapegraphai.com/v1';
		
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'smartscraper') {
					if (operation === 'scrape') {
						const websiteUrl = this.getNodeParameter('websiteUrl', i) as string;
						const userPrompt = this.getNodeParameter('userPrompt', i) as string;

						const response = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/smartscraper`,
							headers: {
								'accept': 'application/json',
								'SGAI-APIKEY': credentials.apiKey,
								'Content-Type': 'application/json',
							},
							body: {
								website_url: websiteUrl,
								user_prompt: userPrompt,
							},
							json: true,
						});

						returnData.push({ json: response });
					}
				}

				if (resource === 'searchscraper') {
					if (operation === 'search') {
						const userPrompt = this.getNodeParameter('userPrompt', i) as string;

						const response = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/searchscraper`,
							headers: {
								'accept': 'application/json',
								'SGAI-APIKEY': credentials.apiKey,
								'Content-Type': 'application/json',
							},
							body: {
								user_prompt: userPrompt,
							},
							json: true,
						});

						returnData.push({ json: response });
					}
				}

				if (resource === 'markdownify') {
					if (operation === 'convert') {
						const websiteUrl = this.getNodeParameter('websiteUrl', i) as string;

						const response = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/markdownify`,
							headers: {
								'accept': 'application/json',
								'SGAI-APIKEY': credentials.apiKey,
								'Content-Type': 'application/json',
							},
							body: {
								website_url: websiteUrl,
							},
							json: true,
						});

						returnData.push({ json: response });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
} 