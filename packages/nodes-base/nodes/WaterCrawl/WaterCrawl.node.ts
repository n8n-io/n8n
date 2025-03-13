import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { WaterCrawlAPIClient } from './WaterCrawlClient';

export class WaterCrawl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WaterCrawl',
		name: 'waterCrawl',
		icon: 'file:waterCrawl.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume WaterCrawl API',
		defaults: {
			name: 'WaterCrawl',
			color: '#4CAF50',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'waterCrawlApi',
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
						name: 'Crawl',
						value: 'crawl',
					},
				],
				default: 'crawl',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['crawl'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new crawl request',
						action: 'Create a new crawl request',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a specific crawl request',
						action: 'Get a specific crawl request',
					},
					{
						name: 'Get Crawl Requests',
						value: 'getMany',
						description: 'Get many crawl requests',
						action: 'Get many crawl requests',
					},
					{
						name: 'Get Crawl Results',
						value: 'getResults',
						description: 'Get results for a crawl request',
						action: 'Get results for a crawl request',
					},
					{
						name: 'Scrape URL',
						value: 'scrapeUrl',
						description: 'Scrape a URL directly',
						action: 'Scrape a URL directly',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop a crawl request',
						action: 'Stop a crawl request',
					},
				],
				default: 'scrapeUrl',
			},

			// ----------------------------------
			//         crawl: scrapeUrl
			// ----------------------------------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['scrapeUrl'],
						resource: ['crawl'],
					},
				},
				description: 'The URL to scrape',
			},
			{
				displayName: 'Wait for Results',
				name: 'sync',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['scrapeUrl'],
						resource: ['crawl'],
					},
				},
				description: 'Whether to wait for results or return immediately',
			},
			{
				displayName: 'Download Results',
				name: 'download',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['scrapeUrl'],
						resource: ['crawl'],
						sync: [true],
					},
				},
				description: 'Whether to download the result data or just get the reference URL',
			},
			{
				displayName: 'Page Options',
				name: 'pageOptions',
				type: 'collection',
				placeholder: 'Add Page Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['scrapeUrl', 'create'],
						resource: ['crawl'],
					},
				},
				options: [
					{
						displayName: 'Wait Time (ms)',
						name: 'wait_time',
						type: 'number',
						default: 0,
						description: 'Time to wait after page load in milliseconds',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 30000,
						description: 'Page load timeout in milliseconds',
					},
					{
						displayName: 'Include HTML',
						name: 'include_html',
						type: 'boolean',
						default: false,
						description: 'Whether to include the HTML in the result',
					},
					{
						displayName: 'Include Links',
						name: 'include_links',
						type: 'boolean',
						default: false,
						description: 'Whether to include links found in the page',
					},
					{
						displayName: 'Only Main Content',
						name: 'only_main_content',
						type: 'boolean',
						default: false,
						description: 'Whether to extract only the main content of the page',
					},
					{
						displayName: 'Accept Cookies Selector',
						name: 'accept_cookies_selector',
						type: 'string',
						default: '',
						description: 'CSS selector for the accept cookies button',
					},
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: 'en-US',
						description: 'Locale to use for the browser',
					},
					{
						displayName: 'Extra Headers',
						name: 'extra_headers',
						type: 'json',
						default: '{}',
						description: 'Extra headers to send with the request (JSON)',
					},
					{
						displayName: 'Include Tags',
						name: 'include_tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of HTML tags to include (e.g., "div,p,h1")',
					},
					{
						displayName: 'Exclude Tags',
						name: 'exclude_tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of HTML tags to exclude (e.g., "script,style")',
					},
					{
						displayName: 'Take Screenshot',
						name: 'screenshot',
						type: 'boolean',
						default: false,
						description: 'Whether to take a screenshot of the page',
					},
					{
						displayName: 'Generate PDF',
						name: 'pdf',
						type: 'boolean',
						default: false,
						description: 'Whether to generate a PDF of the page',
					},
				],
			},
			{
				displayName: 'Plugin Options',
				name: 'pluginOptions',
				type: 'json',
				required: true,
				placeholder: 'Add Plugin Option',
				default: '{}',
				displayOptions: {
					show: {
						operation: ['scrapeUrl', 'create'],
						resource: ['crawl'],
					},
				},
			},

			// ----------------------------------
			//         crawl: create
			// ----------------------------------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['crawl'],
					},
				},
				description: 'The URL to crawl',
			},
			{
				displayName: 'Spider Options',
				name: 'spiderOptions',
				type: 'collection',
				placeholder: 'Add Spider Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['crawl'],
					},
				},
				options: [
					{
						displayName: 'Max Pages',
						name: 'page_limit',
						type: 'number',
						default: 10,
						description: 'Maximum number of pages to crawl',
					},
					{
						displayName: 'Max Depth',
						name: 'max_depth',
						type: 'number',
						default: 2,
						description: 'Maximum depth to crawl',
					},
					{
						displayName: 'Allowed Domains',
						name: 'allowed_domains',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of domains to allow during crawling (e.g., "example.com,sub.example.com")',
					},
					{
						displayName: 'Exclude Paths',
						name: 'exclude_paths',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of path patterns to exclude (e.g., "/admin/*,/private/*")',
					},
					{
						displayName: 'Include Paths',
						name: 'include_paths',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of path patterns to include (e.g., "/blog/*,/news/*")',
					},
				],
			},

			// ----------------------------------
			//         crawl: get, getResults, stop
			// ----------------------------------
			{
				displayName: 'Crawl ID',
				name: 'crawlId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['get', 'getResults', 'stop'],
						resource: ['crawl'],
					},
				},
				description: 'The ID of the crawl request',
			},

			// ----------------------------------
			//         crawl: getResults pagination
			// ----------------------------------
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getResults'],
						resource: ['crawl'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getResults'],
						resource: ['crawl'],
					},
				},
				default: 1,
				description: 'Page number to retrieve',
			},

			// ----------------------------------
			//         crawl: getMany
			// ----------------------------------
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getMany'],
						resource: ['crawl'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getMany'],
						resource: ['crawl'],
					},
				},
				default: 1,
				description: 'Page number to retrieve',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('waterCrawlApi');
		const apiKey = credentials.apiKey as string;
		const baseUrl = (credentials.baseUrl as string) || 'https://app.watercrawl.dev';

		// Initialize the client
		const client = new WaterCrawlAPIClient(apiKey, baseUrl);
		console.error('Client initialized');

		// For each item
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'crawl') {
					// ----------------------------------------
					//               crawl
					// ----------------------------------------

					if (operation === 'scrapeUrl') {
						// ----------------------------------
						//         crawl: scrapeUrl
						// ----------------------------------
						const url = this.getNodeParameter('url', i) as string;
						const sync = this.getNodeParameter('sync', i, true) as boolean;
						const download = this.getNodeParameter('download', i, true) as boolean;
						const pageOptions = this.getNodeParameter('pageOptions', i, {}) as IDataObject;
						const pluginOptionsJson = this.getNodeParameter('pluginOptions', i, '{}') as string;

						// Parse plugin options from JSON
						let pluginOptions: IDataObject = {};
						try {
							pluginOptions = JSON.parse(pluginOptionsJson);
						} catch (error) {
							throw new Error(`Invalid JSON in pluginOptions: ${error.message}`);
						}

						// Format pageOptions
						const formattedPageOptions: IDataObject = {};

						// Copy direct properties
						const directProps = [
							'wait_time',
							'timeout',
							'include_html',
							'include_links',
							'only_main_content',
							'accept_cookies_selector',
							'locale',
						];

						for (const prop of directProps) {
							if (pageOptions[prop] !== undefined) {
								formattedPageOptions[prop] = pageOptions[prop];
							}
						}

						// Handle string arrays that come as comma-separated values
						const stringArrayProps = ['include_tags', 'exclude_tags'];
						for (const prop of stringArrayProps) {
							if (pageOptions[prop] && (pageOptions[prop] as string).trim() !== '') {
								formattedPageOptions[prop] = (pageOptions[prop] as string)
									.split(',')
									.map((s) => s.trim());
							}
						}

						// Handle extra_headers as JSON
						if (pageOptions.extra_headers) {
							try {
								formattedPageOptions.extra_headers = JSON.parse(
									pageOptions.extra_headers as string,
								);
							} catch (error) {
								throw new Error(`Invalid JSON in extra_headers: ${error.message}`);
							}
						}

						// Handle actions (screenshot, pdf)
						const actions: { type: string }[] = [];
						if (pageOptions.screenshot === true) {
							actions.push({ type: 'screenshot' });
						}
						if (pageOptions.pdf === true) {
							actions.push({ type: 'pdf' });
						}
						if (actions.length > 0) {
							formattedPageOptions.actions = actions;
						}

						// Use the client to make the request
						const response = await client.scrapeUrl(
							url,
							formattedPageOptions,
							pluginOptions,
							sync,
							download,
						);

						// Return the result - convert to plain object to satisfy IDataObject
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ ...response } as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'create') {
						// ----------------------------------
						//         crawl: create
						// ----------------------------------
						const url = this.getNodeParameter('url', i) as string;
						const spiderOptions = this.getNodeParameter('spiderOptions', i, {}) as IDataObject;
						const pageOptions = this.getNodeParameter('pageOptions', i, {}) as IDataObject;
						const pluginOptionsJson = this.getNodeParameter('pluginOptions', i, '{}') as string;

						// Parse plugin options from JSON
						let pluginOptions: IDataObject = {};
						try {
							pluginOptions = JSON.parse(pluginOptionsJson);
						} catch (error) {
							throw new Error(`Invalid JSON in pluginOptions: ${error.message}`);
						}

						// Format spiderOptions
						const formattedSpiderOptions: IDataObject = {};

						// Copy direct properties
						const spiderDirectProps = ['page_limit', 'max_depth'];
						for (const prop of spiderDirectProps) {
							if (spiderOptions[prop] !== undefined) {
								formattedSpiderOptions[prop] = spiderOptions[prop];
							}
						}

						// Handle string arrays that come as comma-separated values
						const spiderStringArrayProps = ['allowed_domains', 'exclude_paths', 'include_paths'];
						for (const prop of spiderStringArrayProps) {
							if (spiderOptions[prop] && (spiderOptions[prop] as string).trim() !== '') {
								formattedSpiderOptions[prop] = (spiderOptions[prop] as string)
									.split(',')
									.map((s) => s.trim());
							}
						}

						// Format pageOptions (same as in scrapeUrl)
						const formattedPageOptions: IDataObject = {};

						// Copy direct properties
						const directProps = [
							'wait_time',
							'timeout',
							'include_html',
							'include_links',
							'only_main_content',
							'accept_cookies_selector',
							'locale',
						];

						for (const prop of directProps) {
							if (pageOptions[prop] !== undefined) {
								formattedPageOptions[prop] = pageOptions[prop];
							}
						}

						// Handle string arrays that come as comma-separated values
						const stringArrayProps = ['include_tags', 'exclude_tags'];
						for (const prop of stringArrayProps) {
							if (pageOptions[prop] && (pageOptions[prop] as string).trim() !== '') {
								formattedPageOptions[prop] = (pageOptions[prop] as string)
									.split(',')
									.map((s) => s.trim());
							}
						}

						// Handle extra_headers as JSON
						if (pageOptions.extra_headers) {
							try {
								formattedPageOptions.extra_headers = JSON.parse(
									pageOptions.extra_headers as string,
								);
							} catch (error) {
								throw new Error(`Invalid JSON in extra_headers: ${error.message}`);
							}
						}

						// Handle actions (screenshot, pdf)
						const actions: { type: string }[] = [];
						if (pageOptions.screenshot === true) {
							actions.push({ type: 'screenshot' });
						}
						if (pageOptions.pdf === true) {
							actions.push({ type: 'pdf' });
						}
						if (actions.length > 0) {
							formattedPageOptions.actions = actions;
						}

						// Handle viewport
						if (pageOptions.viewport_width || pageOptions.viewport_height) {
							formattedPageOptions.viewport = {
								width: pageOptions.viewport_width || 1920,
								height: pageOptions.viewport_height || 1080,
							};
						}

						// Use the client to make the request
						const response = await client.createCrawlRequest(
							url,
							formattedSpiderOptions,
							formattedPageOptions,
							pluginOptions,
						);

						// Return the result - convert to plain object to satisfy IDataObject
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ ...response } as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'get') {
						// ----------------------------------
						//         crawl: get
						// ----------------------------------
						const crawlId = this.getNodeParameter('crawlId', i) as string;

						// Use the client to make the request
						const response = await client.getCrawlRequest(crawlId);

						// Return the result - convert to plain object to satisfy IDataObject
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ ...response } as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getMany') {
						// ----------------------------------
						//         crawl: getMany
						// ----------------------------------

						const limit = this.getNodeParameter('limit', i) as number;
						const page = this.getNodeParameter('page', i) as number;
						const response = await client.getCrawlRequestsList(page, limit);

						// Return the result - map array items to plain objects to satisfy IDataObject[]
						const results = response.results.map((item) => ({ ...item }) as IDataObject);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getResults') {
						// ----------------------------------
						//         crawl: getResults
						// ----------------------------------
						const crawlId = this.getNodeParameter('crawlId', i) as string;

						// Get pagination parameters
						const page = this.getNodeParameter('page', i, 1) as number;
						const pageSize = this.getNodeParameter('limit', i, 50) as number;

						// Use the client to make the request
						const response = await client.getCrawlRequestResults(crawlId, page, pageSize);

						// Return the result - map array items to plain objects to satisfy IDataObject[]
						const results = response.results.map((item) => ({ ...item }) as IDataObject);
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(results),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'stop') {
						// ----------------------------------
						//         crawl: stop
						// ----------------------------------
						const crawlId = this.getNodeParameter('crawlId', i) as string;

						// Use the client to make the request
						await client.stopCrawlRequest(crawlId);

						// Return success message
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({
								success: true,
								message: `Crawl request ${crawlId} stopped successfully`,
							}),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
