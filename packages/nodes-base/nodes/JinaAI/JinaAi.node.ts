import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

export class JinaAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jina AI',
		name: 'jinaAi',
		icon: 'file:jinaAI.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Interact with Jina AI API',
		defaults: {
			name: 'Jina AI',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		// TODO: required for some operations, optional for others
		credentials: [
			{
				name: 'jinaAiApi',
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
						name: 'Reader',
						value: 'reader',
					},
					{
						name: 'Research',
						value: 'research',
					},
				],
				default: 'reader',
			},
			// Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['reader'],
					},
				},
				options: [
					{
						name: 'Read',
						value: 'read',
						action: 'Read URL content',
						description:
							'Fetches content from a URL and converts it to clean, LLM-friendly formats',
					},
					{
						name: 'Search',
						value: 'search',
						action: 'Search Web',
						description:
							'Performs a web search via Jina AI and returns top results as clean, LLM-friendly formats',
					},
				],
				default: 'read',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['research'],
					},
				},
				options: [
					{
						name: 'Deep Research',
						value: 'deepResearch',
						action: 'Perform Deep Research',
						description: 'Research a topic and generate a structured research report',
					},
				],
				default: 'deepResearch',
			},
			// Options for Reader
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://jina.ai/',
				description: 'The URL to fetch content from',
				displayOptions: {
					show: {
						resource: ['reader'],
						operation: ['read'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['reader'],
						operation: ['read'],
					},
				},
				options: [
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						description: 'Specify desired output format',
						type: 'options',
						options: [
							{
								name: 'HTML',
								value: 'html',
							},
							{
								name: 'JSON',
								value: 'json',
							},
							{
								name: 'Markdown',
								value: 'markdown',
							},
							{
								name: 'Screenshot',
								value: 'screenshot',
							},
							{
								name: 'Text',
								value: 'text',
							},
						],
						default: 'json',
					},
					{
						displayName: 'Target CSS Selector',
						name: 'targetSelector',
						type: 'string',
						description: 'CSS selector to focus on specific page elements',
						default: '',
						placeholder: 'e.g. #main-content .article',
					},
					{
						displayName: 'Exclude CSS Selector',
						name: 'excludeSelector',
						type: 'string',
						description: 'CSS selector for elements to remove',
						default: '',
						placeholder: 'e.g. header, footer, .ads',
					},
					{
						displayName: 'Enable Image Captioning',
						name: 'enableImageCaptioning',
						type: 'boolean',
						default: false,
						description: 'Whether to generate captions for images within the content',
					},
					{
						displayName: 'Wait for CSS Selector',
						name: 'waitForSelector',
						type: 'string',
						description:
							'Wait for a specific element to appear before extracting content (for dynamic pages)',
						default: '',
						placeholder: 'e.g. #results-loaded',
					},
				],
			},
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Jina AI',
				displayOptions: {
					show: {
						resource: ['reader'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['reader'],
						operation: ['search'],
					},
				},
				options: [
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						description: 'Specify desired output format',
						type: 'options',
						options: [
							{
								name: 'HTML',
								value: 'html',
							},
							{
								name: 'JSON',
								value: 'json',
							},
							{
								name: 'Markdown',
								value: 'markdown',
							},
							{
								name: 'Screenshot',
								value: 'screenshot',
							},
							{
								name: 'Text',
								value: 'text',
							},
						],
						default: 'json',
					},
					{
						displayName: 'Site Filter',
						name: 'siteFilter',
						type: 'string',
						description: 'Restrict search to specific websites',
						default: '',
						placeholder: 'e.g. jina.ai, github.com',
					},
				],
			},
			// Options for Research
			{
				displayName: 'Research Query',
				name: 'researchQuery',
				type: 'string',
				required: true,
				default: '',
				description: 'The topic or question for the AI to research',
				placeholder:
					'e.g. Analyze the impact of renewable energy sources on climate change mitigation',
				displayOptions: {
					show: {
						resource: ['research'],
						operation: ['deepResearch'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['research'],
						operation: ['deepResearch'],
					},
				},
				options: [
					{
						displayName: 'Max Returned Sources',
						name: 'maxReturnedSources',
						description: 'The maximum number of URLs to include in the final answer',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: '',
						placeholder: 'e.g. 5',
					},
					{
						displayName: 'Prioritize Sources',
						name: 'prioritizeSources',
						type: 'string',
						description: 'A list of domains that are given a higher priority for content retrieval',
						default: '',
						placeholder: 'e.g. jina.ai, github.com',
					},
					{
						displayName: 'Exclude Sources',
						name: 'excludeSources',
						type: 'string',
						description: 'A list of domains to be strictly excluded from content retrieval',
						default: '',
						placeholder: 'e.g. jina.ai, github.com',
					},
					{
						displayName: 'Site Filter',
						name: 'siteFilter',
						type: 'string',
						description: 'Restrict search to specific websites',
						default: '',
						placeholder: 'e.g. jina.ai, github.com',
					},
				],
			},
		],
	};
}
