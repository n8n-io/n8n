import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { chat, search, async } from './descriptions';
import { processProSearchResponse, sendErrorPostReceive } from './GenericFunctions';

export const PERPLEXITY_OPERATIONS = [
	{
		name: 'Chat',
		value: 'chat',
		action: 'Chat with a model',
		description: 'Standard chat completion. Use for immediate responses.',
		routing: {
			request: {
				method: 'POST' as const,
				url: '/chat/completions',
			},
			output: {
				postReceive: [sendErrorPostReceive, processProSearchResponse],
			},
		},
	},
	{
		name: 'Search',
		value: 'search',
		action: 'Search the web',
		description: 'Search the web and return ranked results with advanced filtering',
		routing: {
			request: {
				method: 'POST' as const,
				url: '/search',
			},
			output: {
				postReceive: [sendErrorPostReceive],
			},
		},
	},
	{
		name: 'Create Async Chat',
		value: 'asyncCreate',
		action: 'Start a long-running chat task',
		description:
			'Submit a chat request for background processing. Returns a Request ID immediately.',
		routing: {
			request: {
				method: 'POST' as const,
				url: '/async/chat/completions',
			},
			output: {
				postReceive: [sendErrorPostReceive],
			},
		},
	},
	{
		name: 'Get Async Status',
		value: 'asyncGet',
		action: 'Check the status of an async task',
		description: 'Retrieve the status and result of an asynchronous chat completion job',
		routing: {
			request: {
				method: 'GET' as const,
				url: '=/async/chat/completions/{{ $parameter.requestId }}',
			},
			output: {
				postReceive: [sendErrorPostReceive],
			},
		},
	},
	{
		name: 'List Async Requests',
		value: 'asyncList',
		action: 'List recent async tasks',
		description: 'List all asynchronous chat completion requests',
		routing: {
			request: {
				method: 'GET' as const,
				url: '/async/chat/completions',
			},
			output: {
				postReceive: [sendErrorPostReceive],
			},
		},
	},
];

export class Perplexity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Perplexity',
		name: 'perplexity',
		icon: {
			light: 'file:perplexity.svg',
			dark: 'file:perplexity.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Interact with the Perplexity API to generate AI responses, search the web, or manage async requests',
		defaults: {
			name: 'Perplexity',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'perplexityApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.perplexity.ai',
			ignoreHttpStatusErrors: true,
			headers: {
				'X-Service': 'n8n',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: PERPLEXITY_OPERATIONS,
				default: 'chat',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['chat', 'asyncCreate'],
					},
				},
				description:
					'The model to use. Valid models are: sonar, sonar-pro, sonar-deep-research, sonar-reasoning-pro. See https://docs.perplexity.ai/getting-started/models for details.',
				options: [
					{ name: 'Sonar', value: 'sonar' },
					{ name: 'Sonar Pro', value: 'sonar-pro' },
					{ name: 'Sonar Deep Research', value: 'sonar-deep-research' },
					{ name: 'Sonar Reasoning Pro', value: 'sonar-reasoning-pro' },
				],
				routing: {
					send: {
						type: 'body',
						property: '={{ $parameter.operation === "asyncCreate" ? "request.model" : "model" }}',
					},
				},
				default: 'sonar',
			},
			{
				displayName: 'Reasoning Effort',
				name: 'reasoningEffort',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['chat', 'asyncCreate'],
						model: ['sonar-deep-research'],
					},
				},
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
				default: 'medium',
				description: 'Controls how much computational effort the AI dedicates to each query',
				routing: {
					send: {
						type: 'body',
						property:
							'={{ $parameter.operation === "asyncCreate" ? "request.reasoning_effort" : "reasoning_effort" }}',
					},
				},
			},
			{
				displayName: 'Pro Search',
				name: 'proSearch',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['chat', 'asyncCreate'],
						model: ['sonar-pro'],
					},
				},
				description:
					'Whether to enable Perplexity Pro Search for deeper, multi-step research. Requires streaming.',
				routing: {
					send: {
						type: 'body',
						property:
							'={{ $parameter.operation === "asyncCreate" ? "request.web_search_options.search_type" : "web_search_options.search_type" }}',
						value: '={{ $value ? "pro" : undefined }}',
					},
				},
			},
			...chat.properties,
			...search.properties,
			...async.properties,
		],
	};
}
