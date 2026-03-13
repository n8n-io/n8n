import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		options: [
			{ name: 'PPLX Embed v1 0.6B', value: 'pplx-embed-v1-0.6b' },
			{ name: 'PPLX Embed v1 4B', value: 'pplx-embed-v1-4b' },
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
];

const displayOptions = {
	show: {
		resource: ['embedding'],
		operation: ['createEmbedding'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
