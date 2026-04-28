import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		options: [
			{ name: 'PPLX Embed V1 0.6B', value: 'pplx-embed-v1-0.6b' },
			{ name: 'PPLX Embed V1 4B', value: 'pplx-embed-v1-4b' },
		],
		default: 'pplx-embed-v1-4b',
		description: 'The embedding model to use',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Input Texts',
		name: 'input',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		placeholder: 'One text per line',
		description: 'Text(s) to embed. Put each text on a separate line.',
		routing: {
			send: {
				type: 'body',
				property: 'input',
				value: '={{ $value.split("\\n").map(s => s.trim()).filter(s => s) }}',
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
				description: 'The format of the returned embeddings',
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
		operation: ['createEmbedding'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
