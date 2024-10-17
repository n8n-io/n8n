import { INodeProperties } from 'n8n-workflow';

export const Scrape: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['Scrape'],
			},
		},
		options: [
			{
				name: 'Scrape Web Page',
				value: 'ScrapeWebPage',
				action: 'Scrape web page',
				description: 'Scrape a web page given its URL',
			},
			{
				name: 'Scrape API Request',
				value: 'ScrapeAPIRequest',
				action: 'Scrape api request',
				description: 'Send a web scraping API request',
			},
		],
		default: 'ScrapeWebPage',
		noDataExpression: true,
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://httpbin.dev/',
		description: 'Web page URL to scrape',
		displayOptions: {
			show: {
				operation: ['ScrapeWebPage', 'ScrapeAPIRequest'],
				resource: ['Scrape'],
			},
		},
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		options: [
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'HEAD',
				value: 'HEAD',
			},
			{
				name: 'OPTIONS',
				value: 'OPTIONS',
			},
			{
				name: 'PATCH',
				value: 'PATCH',
			},
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
		],
		required: true,
		default: 'GET',
		description: 'HTTP method to use',
		displayOptions: {
			show: {
				operation: ['ScrapeWebPage', 'ScrapeAPIRequest'],
				resource: ['Scrape'],
			},
		},
	},
	// scrape web page additional fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['ScrapeWebPage'],
				resource: ['Scrape'],
			},
		},
		options: [
			{
				displayName: 'Body',
				description: 'HTTP request body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Headers',
				description: 'HTTP request headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'headers',
						displayName: 'Headers',
						values: [
							{
								displayName: 'Key',
								name: 'name',
								type: 'string',
								description: 'Header key',
								default: '',
								placeholder: 'Accept-Language',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value',
								placeholder: 'en-US,en;q=0.5',
							},
						],
					},
				],
				default: {},
			},
			{
				displayName: 'Retry',
				description: 'Whether to retry the request on failures',
				name: 'retry',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Timeout',
				description:
					"Timeout expressed in milliseconds, set to 150000 by default. It represents the maximum time allowed for ScrapFly to try to perform the scrape. It's prone to other settings, such as retry, rendering_wait, and wait_for_selector. If not defined, managed by Scrapfly",
				name: 'timeout',
				type: 'number',
				default: 150000,
			},
			{
				displayName: 'Proxy Pool',
				description: 'The used IP address proxy pool',
				name: 'proxy_pool',
				type: 'options',
				options: [
					{ name: 'Public Datacenter Pool', value: 'public_datacenter_pool' },
					{ name: 'Public Residential Pool', value: 'public_residential_pool' },
				],
				default: 'public_datacenter_pool',
			},
			{
				displayName: 'Country',
				description: 'Proxy geolocation country code',
				name: 'country',
				type: 'string',
				default: 'us',
			},
			{
				displayName: 'Anti-Scraping Protection',
				description: 'Whether to enable anti-scraping protection to bypass antibots',
				name: 'asp',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Cost Budget',
				description:
					'ASP dynamically retry and upgrade some parameters (such as proxy_pool, browser) to pass and this changes dynamically the cost of the call, to make it more predictable, you can define a budget to respect. Make sure to set the minimum required to pass your target or the call will be rejected without even trying.',
				name: 'cost_budget',
				type: 'number',
				default: null,
			},
			{
				displayName: 'Render JS',
				description: 'Whether to enable JavaScript rendering through using a headless browser',
				name: 'render_js',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Auto Scroll',
				description: 'Whether to automatially scroll down the page by the headless browser',
				name: 'auto_scroll',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Rendering Wait',
				description:
					'Time in milliseconds for the headless browser to wait for after requesting the target web page',
				name: 'rendering_wait',
				type: 'number',
				default: 1000,
			},
			{
				displayName: 'Rendering Stage',
				description:
					'Stage to wait when rendering the page, You can choose between complete which is the default, or domcontentloaded if you want a fast render without waiting the full rendering (faster scrape)',
				name: 'rendering_stage',
				type: 'options',
				options: [
					{ name: 'Complete', value: 'complete' },
					{ name: 'Dom Content Load', value: 'domcontentloaded' },
				],
				default: 'complete',
			},
			{
				displayName: 'Wait For Selector',
				description: 'XPath or CSS selector to wait for by the headless browser',
				name: 'wait_for_selector',
				type: 'string',
				default: '',
			},
			{
				displayName: 'JavaScript Injection',
				description: 'JavaScript injection code for execution by the headless browser',
				name: 'js',
				type: 'string',
				default: '',
			},
			{
				displayName: 'JavaScript Scenario',
				description:
					'JavaScript scenarios to execute by the headless browser, such as waits, clicking, or filling elements. It must be URL-safe base64-encoded.',
				name: 'js_scenario',
				type: 'json',
				default: '',
			},
			{
				displayName: 'Screenshots',
				description:
					'Take screenshots of whole page or specific areas. You can take multiple screenshots of different areas. The key argument is the name of the screenshot and the value is the selector or fullpage',
				name: 'screenshots',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'screenshots',
						displayName: 'Screenshots',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								description: 'Screenshot name',
								default: '',
								placeholder: 'Screenshot-1',
							},
							{
								displayName: 'Selector',
								name: 'selector',
								type: 'string',
								default: '',
								description: 'Screenshot selector',
								placeholder: 'fullpage',
							},
						],
					},
				],
				default: {},
			},
			{
				displayName: 'Screenshot Flags',
				description:
					'Screenshot flags to customize the screenshot behavior. You can set the quality, format, and more.',
				name: 'screenshot_flags',
				type: 'multiOptions',
				options: [
					{
						name: 'Block Banners',
						value: 'block_banners',
					},
					{
						name: 'Dark Mode',
						value: 'dark_mode',
					},
					{
						name: 'High Quality',
						value: 'high_quality',
					},
					{
						name: 'Load Images',
						value: 'load_images',
					},
					{
						name: 'Print Media Format',
						value: 'print_media_format',
					},
				],
				default: [],
			},
			{
				displayName: 'Format',
				description:
					'By default, the format is the raw content of the scraped content, e.g: you scrape HTML/JSON, you will get the HTML/JSON content left untouched. The text and markdown formats are accessible by LLMs.',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'Clean HTML', value: 'clean_html' },
					{ name: 'JSON', value: 'json' },
					{ name: 'Markdown', value: 'markdown' },
					{ name: 'Raw', value: 'raw' },
					{ name: 'Text', value: 'text' },
				],
				default: 'raw',
			},
			{
				displayName: 'Format Options',
				description:
					'Format options to customize the output. Only available for the markdown format.',
				name: 'format_options',
				type: 'multiOptions',
				options: [
					{ name: 'No Links', value: 'no_links' },
					{ name: 'No Images', value: 'no_images' },
					{ name: 'Only Content', value: 'only_content' },
				],
				default: [],
			},
			{
				displayName: 'Extraction Template',
				description:
					'Define a JSON extraction template to get structured data. It must be URL-safe base64-encoded.',
				name: 'extraction_template',
				type: 'json',
				default: '',
			},
			{
				displayName: 'Extraction Prompt',
				description:
					'Instruction to extract data or ask question on the scraped content with an LLM (Large Language Model)',
				name: 'extraction_prompt',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Extraction Model',
				description: 'AI Extraction to auto parse the scraped document to get structured data',
				name: 'extraction_model',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Session',
				description:
					'Session name to be reused - Automatically store and restore cookies, fingerprint and proxy across many scrapes. Must be alphanumeric, max length is 255 characters.',
				name: 'session',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Session Sticky Proxy',
				description: 'Whether to reuse the same proxy ip, best effort is made to keep it',
				name: 'session_sticky_proxy',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Cache',
				description:
					'Whether to enable the cache layer. If the cache is MISS the scrape is performed otherwise the cached content is returned. If the TTL is expired, the cache will be refreshed by scraping again the target',
				name: 'cache',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Cache TTL',
				description:
					'Cache Time To Live in seconds. If you do a scrape after the TTL has expired, the target will be scraped and the cache refreshed with the new data.',
				name: 'cache_ttl',
				type: 'number',
				default: 86400,
			},
			{
				displayName: 'Cache Clear',
				description:
					'Whether to refresh the cache and ensure the scrape is performed to cache the new version',
				name: 'cache_clear',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Proxified Response',
				description:
					'Whether to return the content of the page directly as body and status code / headers are replaced with the response values. If you use a custom format like JSON or markdown, the content type will be altered to match the selected format.',
				name: 'proxified_response',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Debug',
				description: 'Whether to enable the debug mode',
				name: 'debug',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Tags',
				description:
					'Add tags to your scrapes to group them which then can be filtered for in the dashboard',
				name: 'tags',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'tags',
						displayName: 'Tags',
						values: [
							{
								displayName: 'Tag Name',
								name: 'Tag',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Oeprating System',
				description:
					'Operating System, if not selected it is random. Note: you cannot set os parameter and User-Agent header at the same time.',
				name: 'os',
				type: 'options',
				options: [
					{ name: 'Win11', value: 'win11' },
					{ name: 'Mac', value: 'mac' },
					{ name: 'Linux', value: 'linux' },
					{ name: 'Chromeos', value: 'chromeos' },
				],
				default: 'win11',
			},
			{
				displayName: 'Language',
				description:
					'Web page language. By default, it is dependent on the proxy country Behind the scenes, it configures the Accept-Language HTTP header. If the website support the language, the content will be in that lang',
				name: 'lang',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Gelocation',
				description:
					'Grant geolocation permission and spoof latitude and longitude. Format: latitude,longitude.',
				name: 'geolocation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'DNS',
				description: 'Whether to query and retrieve target DNS information',
				name: 'dns',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'SSL',
				description:
					'Whether to pull remote SSL certificate and collect other TLS information. Only available for https://. Note that this parameter is not required to scrape https:// targets - it is for collecting SSL data',
				name: 'ssl',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Correlation ID',
				description:
					'Helper ID for correlating a group of scrapes issued by the same worker or machine. You can use it as a filter in our monitoring dashboard.',
				name: 'correlation_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Webhook',
				description:
					'Queue you scrape request and redirect API response to a provided webhook endpoint. You can create a webhook endpoint from your dashboard, it takes the name of the webhook. Webhooks are scoped to the given project/env',
				name: 'webhook_name',
				type: 'string',
				default: '',
			},
		],
	},
	// scrape api request additional fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['ScrapeAPIRequest'],
				resource: ['Scrape'],
			},
		},
		options: [
			{
				displayName: 'Body',
				description: 'HTTP request body',
				name: 'body',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Headers',
				description: 'HTTP request headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'headers',
						displayName: 'Headers',
						values: [
							{
								displayName: 'Key',
								name: 'name',
								type: 'string',
								description: 'Header key',
								default: '',
								placeholder: 'Accept-Language',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value',
								placeholder: 'en-US,en;q=0.5',
							},
						],
					},
				],
				default: {},
			},

			{
				displayName: 'Proxy Pool',
				description: 'The used IP address proxy pool',
				name: 'proxy_pool',
				type: 'options',
				options: [
					{ name: 'Public Datacenter Pool', value: 'public_datacenter_pool' },
					{ name: 'Public Residential Pool', value: 'public_residential_pool' },
				],
				default: 'public_datacenter_pool',
			},
			{
				displayName: 'Country',
				description: 'Proxy geolocation country code',
				name: 'country',
				type: 'string',
				default: 'us',
			},
			{
				displayName: 'Anti-Scraping Protection',
				description: 'Whether to enable anti-scraping protection to bypass antibots',
				name: 'asp',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Session',
				description:
					'Session name to be reused - Automatically store and restore cookies, fingerprint and proxy across many scrapes. Must be alphanumeric, max length is 255 characters.',
				name: 'session',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Session Sticky Proxy',
				description: 'Whether to reuse the same proxy ip (best effort is made)',
				name: 'session_sticky_proxy',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Debug',
				description: 'Whether to enable the debug mode',
				name: 'debug',
				type: 'boolean',
				default: false,
			},
		],
	},
];
