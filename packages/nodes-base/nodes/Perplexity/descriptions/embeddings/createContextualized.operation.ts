import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		options: [{ name: 'PPLX Embed Context V1 4B', value: 'pplx-embed-context-v1-4b' }],
		default: 'pplx-embed-context-v1-4b',
		description: 'The contextualized embedding model to use',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Input Documents',
		name: 'input',
		type: 'json',
		required: true,
		default: '[["paragraph 1 of doc A", "paragraph 2 of doc A"], ["paragraph 1 of doc B"]]',
		description: 'Array of documents, where each document is an array of paragraph strings',
		routing: {
			send: {
				type: 'body',
				property: 'input',
				value: '={{ JSON.parse($value) }}',
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
				displayName: 'Dimensions',
				name: 'dimensions',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				description:
					'Number of dimensions for the output embedding. If 0 or unset, the full model dimensions are used.',
				routing: {
					send: {
						type: 'body',
						property: 'dimensions',
						value: '={{ $value || undefined }}',
					},
				},
			},
			{
				displayName: 'Encoding Format',
				name: 'encoding_format',
				type: 'options',
				default: 'base64_int8',
				options: [
					{ name: 'Base64 Int8', value: 'base64_int8' },
					{ name: 'Base64 Binary', value: 'base64_binary' },
				],
				description:
					'The format of the returned embeddings. Float is not supported by this endpoint.',
				routing: {
					send: {
						type: 'body',
						property: 'encoding_format',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['embedding'],
		operation: ['createContextualized'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
