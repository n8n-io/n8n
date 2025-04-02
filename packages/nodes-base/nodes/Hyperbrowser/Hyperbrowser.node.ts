import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { Hyperbrowser as HyperbrowserClient } from '@hyperbrowser/sdk';
import { ScrapeFormat, Country, CreateSessionParams, ScrapeOptions } from '@hyperbrowser/sdk/types';
// Add Node.js process type declaration
declare const process: {
	env: Record<string, string | undefined>;
};

export class Hyperbrowser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperbrowser',
		name: 'hyperbrowser',
		icon: 'file:hyperbrowser.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with websites using Hyperbrowser',
		defaults: {
			name: 'Hyperbrowser',
		},
		// @ts-ignore
		inputs: ['main'],
		// @ts-ignore
		outputs: ['main'],
		credentials: [
			{
				name: 'hyperbrowserApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Browser Use',
						value: 'browserUse',
						description: 'Hyperbrowser Browser Agent using Browser-Use',
						action: 'Use browser with AI',
					},
					{
						name: 'Claude Computer Use',
						value: 'claudeComputerUse',
						description: 'Use Claude to control computer actions',
						action: 'Hyperbrowser Browser Agent using Claude computer-use',
					},
					{
						name: 'Crawl',
						value: 'crawl',
						description: 'Crawl a website and its links',
						action: 'Crawl a website',
					},
					{
						name: 'Extract',
						value: 'extract',
						description: 'Extract specific data from a webpage using AI',
						action: 'Extract data from a webpage',
					},
					{
						name: 'OpenAI CUA',
						value: 'openaiCua',
						description: 'Use OpenAI to control user actions',
						action: 'Hyperbrowser Browser Agent using OpenAI CUA',
					},
					{
						name: 'Scrape',
						value: 'scrape',
						description: 'Scrape a URL',
						action: 'Scrape a URL',
					},
				],
				default: 'scrape',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				description: 'URL to process',
				placeholder: 'https://example.com',
				displayOptions: {
					show: {
						operation: ['scrape', 'crawl', 'extract'],
					},
				},
			},
			{
				displayName: 'Extraction Query',
				name: 'extractionQuery',
				type: 'json',
				required: true,
				default: '',
				description: 'What data to extract from the webpage (e.g., "Extract all product prices")',
				displayOptions: {
					show: {
						operation: ['extract'],
					},
				},
			},
			{
				displayName: 'Task',
				name: 'task',
				type: 'string',
				required: true,
				default: '',
				description:
					'Instructions for browser automation (e.g., "Click the login button and fill in the form")',
				displayOptions: {
					show: {
						operation: ['browserUse', 'claudeComputerUse', 'openaiCua'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Max Steps',
						name: 'maxSteps',
						type: 'number',
						default: 25,
						description: 'Maximum number of steps the agent should have to complete the task',
						displayOptions: {
							show: {
								'/operation': ['browserUse', 'claudeComputerUse', 'openaiCua'],
							},
						},
					},
					{
						displayName: 'Maximum Pages',
						name: 'maxPages',
						type: 'number',
						default: 10,
						description: 'Maximum number of pages to crawl',
						displayOptions: {
							show: {
								'/operation': ['crawl'],
							},
						},
					},
					{
						displayName: 'Only Main Content',
						name: 'onlyMainContent',
						type: 'boolean',
						default: true,
						description: 'Whether to return only the main content of the page',
						displayOptions: {
							show: {
								'/operation': ['crawl', 'scrape'],
							},
						},
					},
					{
						displayName: 'Output Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'HTML',
								value: 'html',
							},
							{
								name: 'Links',
								value: 'links',
							},
							{
								name: 'Markdown',
								value: 'markdown',
							},
						],
						default: 'markdown',
						description: 'Output format to return',
						displayOptions: {
							show: {
								'/operation': ['scrape', 'crawl'],
							},
						},
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						description: 'Country for proxy server',
						displayOptions: {
							show: {
								useProxy: [true],
							},
						},
					},
					{
						displayName: 'Solve CAPTCHAs',
						name: 'solveCaptchas',
						type: 'boolean',
						default: false,
						description: 'Whether to solve CAPTCHAs during scraping',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 15000,
						description: 'Maximum timeout for navigating to a page in milliseconds',
					},
					{
						displayName: 'Use Proxy',
						name: 'useProxy',
						type: 'boolean',
						default: false,
						description: 'Whether to use a proxy for scraping',
					},
					{
						displayName: 'Use Vision',
						name: 'useVision',
						type: 'boolean',
						default: true,
						description: 'Whether to use vision for Browser Use LLM',
						displayOptions: {
							show: {
								'/operation': ['browserUse'],
							},
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('hyperbrowserApi');
		const client = new HyperbrowserClient({
			apiKey: credentials.apiKey as string,
		});

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as {
					format?: ScrapeFormat;
					onlyMainContent?: boolean;
					timeout?: number;
					useProxy?: boolean;
					solveCaptchas?: boolean;
					proxyCountry?: Country;
					maxPages?: number;
					browserSessionTimeout?: number;
					useVision?: boolean;
					maxSteps?: number;
				};

				const sessionOptions: CreateSessionParams | undefined = options.useProxy
					? {
							useProxy: true,
							solveCaptchas: options.solveCaptchas || false,
							proxyCountry: options.proxyCountry || 'US',
						}
					: undefined;

				let responseData: IDataObject;

				if (operation === 'scrape') {
					const url = this.getNodeParameter('url', i) as string;
					const scrapeOptions: ScrapeOptions = {
						formats: [options.format || 'markdown'],
						onlyMainContent: options.onlyMainContent ?? true,
						timeout: options.timeout || 15000,
					};

					const response = await client.scrape.startAndWait({
						url,
						scrapeOptions,
						sessionOptions,
					});

					responseData = {
						url,
						content: response.data,
						status: response.status,
					};
				} else if (operation === 'crawl') {
					const url = this.getNodeParameter('url', i) as string;
					const response = await client.crawl.startAndWait({
						url,
						maxPages: options.maxPages || 10,
						scrapeOptions: {
							formats: ['markdown'],
							onlyMainContent: options.onlyMainContent ?? true,
							timeout: options.timeout || 15000,
						},
						sessionOptions,
					});

					responseData = {
						url,
						data: response.data,
						status: response.status,
					};
				} else if (operation === 'extract') {
					const url = this.getNodeParameter('url', i) as string;
					const extractionQuery = this.getNodeParameter('extractionQuery', i) as string;
					const response = await client.extract.startAndWait({
						urls: [url],
						prompt: extractionQuery,
						sessionOptions,
					});

					responseData = {
						url,
						extractedData: response.data,
						status: response.status,
					};
				} else if (operation === 'browserUse') {
					const browserInstructions = this.getNodeParameter('task', i) as string;
					const useVision = options.useVision;
					const maxSteps = options.maxSteps;
					const response = await client.agents.browserUse.startAndWait({
						task: browserInstructions,
						useVision,
						maxSteps,
						sessionOptions,
					});

					responseData = {
						actions: response.data?.finalResult,
						status: response.status,
					};
				} else if (operation === 'claudeComputerUse') {
					const computerInstructions = this.getNodeParameter('task', i) as string;
					const maxSteps = options.maxSteps;
					const response = await client.agents.claudeComputerUse.startAndWait({
						task: computerInstructions,
						maxSteps,
						sessionOptions,
					});

					responseData = {
						actions: response.data?.finalResult,
						status: response.status,
					};
				} else if (operation === 'openaiCua') {
					const userActionInstructions = this.getNodeParameter('task', i) as string;
					const maxSteps = options.maxSteps;
					const response = await client.agents.cua.startAndWait({
						task: userActionInstructions,
						maxSteps,
						sessionOptions,
					});

					responseData = {
						actions: response.data?.finalResult,
						status: response.status,
					};
				} else {
					throw new NodeOperationError(this.getNode(), `Operation "${operation}" is not supported`);
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							task: this.getNodeParameter('operation', i),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
