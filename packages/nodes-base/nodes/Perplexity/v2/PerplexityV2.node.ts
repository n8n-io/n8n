import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { agent, chat, embeddings, search } from '../descriptions';
import { getAgentModels } from '../GenericFunctions';

export class PerplexityV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [1, 2],
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
			},
			properties: [
				// V1: hidden resource selector (only chat)
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'hidden',
					noDataExpression: true,
					options: [
						{
							name: 'Chat',
							value: 'chat',
						},
					],
					default: 'chat',
					displayOptions: {
						show: {
							'@version': [1],
						},
					},
				},
				// V2: visible resource selector (all resources)
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Agent',
							value: 'agent',
							description:
								'Recommended. Create responses using the Agent API with third-party models, presets, tools, and structured outputs.',
						},
						{
							name: 'Chat',
							value: 'chat',
							description:
								'Send messages using Sonar models with built-in web search. Sonar service ends 2026-09-27; switch to the Agent resource.',
						},
						{
							name: 'Embedding',
							value: 'embedding',
							description: 'Generate vector embeddings for text',
						},
						{
							name: 'Search',
							value: 'search',
							description: 'Get raw, ranked web search results',
						},
					],
					default: 'agent',
					displayOptions: {
						show: {
							'@version': [2],
						},
					},
				},
				// V2: deprecation notice shown when Chat resource is selected
				{
					displayName:
						'Sonar Chat Completions is now <a href="https://docs.perplexity.ai/docs/agent-api/quickstart" target="_blank">Agent API</a>. Sonar service ends September 27, 2026. Please migrate by then. See the <a href="https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview" target="_blank">Migration Guide</a>.',
					name: 'chatDeprecationNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							'@version': [2],
							resource: ['chat'],
						},
					},
				},
				...agent.description,
				...chat.description,
				...embeddings.description,
				...search.description,
			],
		};
	}

	methods = {
		listSearch: {
			getAgentModels,
		},
	};
}
