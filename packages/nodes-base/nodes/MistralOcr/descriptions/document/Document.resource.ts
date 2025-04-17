import type { INodeProperties } from 'n8n-workflow';

import * as extractedText from './extractTest.operation';
import { sendErrorPostReceive } from '../../GenericFunctions';

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
				description: 'Extract text from documents using OCR',
				action: 'Extract text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/ocr',
						headers: {
							'Content-Type': 'application/json',
						},
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
		],
		default: 'extractText',
	},

	...extractedText.description,
];
