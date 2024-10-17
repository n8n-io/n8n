import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { scrapflyClient } from './handlers/client';
import { Scrape } from './handlers/scrape/operations';
import { Extraction } from './handlers/extraction/operations';
import { Screenshot } from './handlers/screenshot/operations';
import { Account } from './handlers/account/operations';
import { version } from '../../package.json';

export class Scrapfly implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scrapfly',
		name: 'Scrapfly',
		icon: 'file:scrapfly.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Scrapfly data collection APIs for web page scraping, screenshots, and AI data extraction',
		defaults: {
			name: 'Scrapfly',
		},
		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'ScrapflyApi',
				required: true,
			},
		],
		properties: [
			// resources
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Scrape',
						value: 'Scrape',
					},
					{
						name: 'Extraction',
						value: 'Extraction',
					},
					{
						name: 'Screenshot',
						value: 'Screenshot',
					},
					{
						name: 'Account',
						value: 'Account',
					},
				],
				default: 'Scrape',
			},
			// operations
			...Scrape,
			...Extraction,
			...Screenshot,
			...Account,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let i = 0; i < items.length; i++) {
			const client = new scrapflyClient(this, i, version, items[i]);

			switch (resource) {
				case 'Scrape':
					try {
						const responseData = await client.scrape();
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}
					break;

				case 'Extraction':
					try {
						const responseData = await client.extract();
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}
					break;

				case 'Screenshot':
					try {
						const responseData = await client.screenshot();
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}
					break;

				case 'Account':
					try {
						const responseData = await client.account();
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}
					break;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
