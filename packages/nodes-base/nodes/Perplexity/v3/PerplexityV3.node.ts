import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { agent, embeddings, search } from '../descriptions';
import { getAgentModels } from '../GenericFunctions';

export class PerplexityV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [3],
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
								'Create responses using the Agent API with third-party models, presets, tools, and structured outputs',
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
				},
				...agent.description,
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
