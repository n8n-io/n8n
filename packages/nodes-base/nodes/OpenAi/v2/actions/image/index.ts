import type { INodeProperties } from 'n8n-workflow';

import * as generateImage from './generateImage.operation';
import * as analyzeImage from './analyzeImage.operation';

export { generateImage, analyzeImage };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Analyze Image',
				value: 'analyzeImage',
				action: 'Analyze image',
				description: 'Take in images and answer questions about them',
			},
			{
				name: 'Generate an Image',
				value: 'generateImage',
				action: 'Generate an image',
				description: 'Creates an image from a text prompt',
			},
		],
		default: 'messageModel',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...generateImage.description,
	...analyzeImage.description,
];
