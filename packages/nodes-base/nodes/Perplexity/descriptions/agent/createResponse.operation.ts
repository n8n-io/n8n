import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 3 },
		description: 'The input text prompt to send to the agent',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'The model to use. Uses provider/model format (e.g. openai/gpt-5.2). Leave empty when using a preset.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getAgentModels',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. openai/gpt-5.2',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'model',
				value: '={{ $value }}',
			},
		},
	},
	{
		displayName: 'Preset',
		name: 'preset',
		type: 'string',
		default: '',
		description: 'Preset name to use. Use preset OR model, not both.',
		hint: 'Use a preset OR a model, not both',
		routing: {
			send: {
				type: 'body',
				property: 'preset',
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: false,
		description: 'Whether to return only essential fields (ID, model, output text, citations)',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { "id": $response.body?.id, "model": $response.body?.model, "output_text": $response.body?.output?.find(o => o.type === "message")?.content?.find(c => c.type === "output_text")?.text, "citations": $response.body?.output?.find(o => o.type === "search_results")?.results?.map(r => ({ title: r.title, url: r.url })), "usage": $response.body?.usage } }}',
						},
					},
				],
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
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				default: '',
				typeOptions: { rows: 3 },
				description: 'System-level instructions for the agent',
				routing: {
					send: {
						type: 'body',
						property: 'instructions',
					},
				},
			},
			{
				displayName: 'Language Preference',
				name: 'languagePreference',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'ISO 639-1 language code for the response language preference',
				routing: {
					send: {
						type: 'body',
						property: 'language_preference',
					},
				},
			},
			{
				displayName: 'Max Output Tokens',
				name: 'maxOutputTokens',
				type: 'number',
				default: 1024,
				typeOptions: { minValue: 1 },
				description: 'The maximum number of tokens to generate in the response',
				routing: {
					send: {
						type: 'body',
						property: 'max_output_tokens',
					},
				},
			},
			{
				displayName: 'Max Steps',
				name: 'maxSteps',
				type: 'number',
				default: 5,
				typeOptions: { minValue: 1, maxValue: 10 },
				description: 'Maximum number of agentic steps (1-10)',
				routing: {
					send: {
						type: 'body',
						property: 'max_steps',
					},
				},
			},
			{
				displayName: 'Models (Fallback)',
				name: 'modelsFallback',
				type: 'string',
				default: '',
				placeholder: 'e.g. openai/gpt-5.2,anthropic/claude-sonnet-4-6',
				description: 'Comma-separated list of 1-5 model IDs to use as fallbacks',
				routing: {
					send: {
						type: 'body',
						property: 'models',
						value: '={{ $value.split(",").map(s => s.trim()).filter(s => s) }}',
					},
				},
			},
			{
				displayName: 'Reasoning',
				name: 'reasoning',
				type: 'json',
				default: '',
				description: 'Reasoning configuration object (e.g. {"effort": "high"})',
				routing: {
					send: {
						type: 'body',
						property: 'reasoning',
						value: '={{ JSON.parse($value) }}',
					},
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'json',
				default: '',
				description:
					'JSON schema for structured output. Set type to "json_schema" with a schema property.',
				routing: {
					send: {
						type: 'body',
						property: 'response_format',
						value: '={{ JSON.parse($value) }}',
					},
				},
			},
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'json',
				default: '',
				placeholder: 'e.g. [{"type":"web_search"},{"type":"fetch_url"}]',
				description: 'Array of tool objects to make available to the agent',
				routing: {
					send: {
						type: 'body',
						property: 'tools',
						value: '={{ JSON.parse($value) }}',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['agent'],
		operation: ['createResponse'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
