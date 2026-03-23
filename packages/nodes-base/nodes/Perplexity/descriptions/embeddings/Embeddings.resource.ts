import type { INodeProperties } from 'n8n-workflow';

import { embeddingsErrorPostReceive } from '../../GenericFunctions';
import * as createContextualized from './createContextualized.operation';
import * as createEmbedding from './createEmbedding.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['embedding'],
			},
		},
		options: [
			{
				name: 'Create Embedding',
				value: 'createEmbedding',
				action: 'Create an embedding',
				description: 'Generate vector embeddings for text input',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/embeddings',
					},
					output: {
						postReceive: [embeddingsErrorPostReceive],
					},
				},
			},
			{
				name: 'Create Contextualized Embedding',
				value: 'createContextualized',
				action: 'Create a contextualized embedding',
				description: 'Generate context-aware embeddings for document chunks',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/contextualizedembeddings',
					},
					output: {
						postReceive: [embeddingsErrorPostReceive],
					},
				},
			},
		],
		default: 'createEmbedding',
	},

	...createEmbedding.description,
	...createContextualized.description,
];
