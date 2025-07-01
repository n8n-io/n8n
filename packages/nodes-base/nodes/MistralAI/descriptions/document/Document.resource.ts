import type { INodeProperties } from 'n8n-workflow';

import * as extractText from './extractText.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Extract Text',
				value: 'extractText',
				description: 'Extract text from document using OCR',
				action: 'Extract text',
			},
		],
		default: 'extractText',
	},

	...extractText.description,
];
