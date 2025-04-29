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
				description: 'Generate an image',
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
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['generate'],
			},
		},
		default: '',
		description: 'The AI model to use for image generation',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['generate'],
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
		options: [
			{ name: 'Square', value: 'square' },
			{ name: 'Landscape', value: 'landscape' },
			{ name: 'Portrait', value: 'portrait' },
		],
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['generate'],
			},
		},
		default: 'square',
		description: 'The desired image dimensions',
	},
	{
		displayName: 'Variations',
		name: 'variations',
		type: 'number',
		required: true,
		typeOptions: {
			minValue: 1,
			maxValue: 4,
		},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['generate'],
			},
		},
		default: 1,
		description: 'Number of images to generate (1-4)',
	},
];
