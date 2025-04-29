import type { INodeProperties } from 'n8n-workflow';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate an image using AI',
				action: 'Generate an image',
			},
		],
		default: 'generate',
	},
];

export const imageFields: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['generate'],
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'OpenAI: DALL-E 3',
				value: 'openai/dall-e-3',
				description: 'Latest DALL-E model with enhanced image generation capabilities',
			},
		],
		default: 'openai/dall-e-3',
		description: 'The AI model to use for image generation',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['generate'],
				resource: ['image'],
			},
		},
		default: '',
		description: 'A detailed textual description of the image to be generated',
	},
	{
		displayName: 'Size',
		name: 'size',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['generate'],
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Square (1024x1024) - 90 coins',
				value: 'square',
			},
			{
				name: 'Landscape (1792x1024) - 120 coins',
				value: 'landscape',
			},
			{
				name: 'Portrait (1024x1792) - 120 coins',
				value: 'portrait',
			},
		],
		default: 'square',
		description: 'The desired image dimensions and associated cost',
	},
	{
		displayName: 'Number of Images',
		name: 'variations',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['generate'],
				resource: ['image'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 4,
		},
		default: 1,
		description: 'Number of images to generate (1-4)',
	},
];
