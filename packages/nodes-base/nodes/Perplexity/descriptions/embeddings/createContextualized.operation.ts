import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		options: [{ name: 'PPLX Embed Context v1 4B', value: 'pplx-embed-context-v1-4b' }],
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
];

const displayOptions = {
	show: {
		resource: ['embedding'],
		operation: ['createContextualized'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
