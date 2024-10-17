import { INodeProperties } from 'n8n-workflow';

export const Screenshot: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['Screenshot'],
			},
		},
		options: [
			{
				name: 'Capture Web Page Screenshot',
				value: 'WebPageScreenshot',
				action: 'Capture web page screenshot',
				description: 'Takes a screenshot of a web page given its URL',
			},
		],
		default: 'WebPageScreenshot',
		noDataExpression: true,
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://web-scraping.dev/',
		description: 'Web page URL to scenarios',
		displayOptions: {
			show: {
				operation: ['WebPageScreenshot'],
				resource: ['Screenshot'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['WebPageScreenshot'],
				resource: ['Screenshot'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'products-screenshot',
				description: 'Screenshot file name without extension, by default it uses the URL',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'JPG', value: 'jpg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WEBP', value: 'webp' },
					{ name: 'GIF', value: 'gif' },
				],
				default: 'jpg',
				description: 'Format of the screenshot image',
			},
			{
				displayName: 'Capture',
				name: 'capture',
				type: 'string',
				placeholder: 'viewport',
				default: 'viewport',
				description:
					'Area to capture in the screenshot, by default it captures the viewport. You can capture the full page, a specific element, or a vertical part of the page. It accepts XPATH or CSS Selector to target a specific element',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'string',
				placeholder: '1950x1080',
				default: '1950x1080',
				description: 'Screen resolution for screenshot, width x height',
			},
			{
				displayName: 'Country',
				description: 'Proxy geolocation country code',
				name: 'country',
				type: 'string',
				default: 'us',
			},
			{
				displayName: 'Timeout',
				description:
					"Timeout expressed in milliseconds, set to 150000 by default. It represents the maximum time allowed for ScrapFly to try to perform the scrape. It's prone to other settings, such as retry, rendering_wait, and wait_for_selector. If not defined, managed by Scrapfly",
				name: 'timeout',
				type: 'number',
				default: 30000,
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
				displayName: 'Wait For Selector',
				description: 'XPath or CSS selector to wait for by the headless browser',
				name: 'wait_for_selector',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Options',
				description: 'Screenshot options to customize the screenshot behavior',
				name: 'options',
				type: 'multiOptions',
				options: [
					{ name: 'Dark Mode', value: 'dark_mode' },
					{ name: 'Block Banners', value: 'block_banners' },
					{ name: 'Print Media Format', value: 'print_media_format' },
				],
				default: [],
			},
			{
				displayName: 'Auto Scroll',
				description: 'Whether to automatially scroll down the page by the headless browser',
				name: 'auto_scroll',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'JavaScript Injection',
				description: 'JavaScript injection code for execution by the headless browser',
				name: 'js',
				type: 'string',
				default: '',
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
		],
	},
];
