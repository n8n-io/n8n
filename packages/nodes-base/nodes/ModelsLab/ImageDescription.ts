import type { INodeProperties } from 'n8n-workflow';
import { processAsyncResponse, processImageResponse, sendErrorPostReceive } from './GenericFunctions';

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
				name: 'Generate from Text',
				value: 'text2img',
				action: 'Generate an image from text description',
				description: 'Create images from detailed text prompts using AI models',
				routing: {
					request: {
						method: 'POST',
						url: '/images/text2img',
					},
					output: {
						postReceive: [processImageResponse],
					},
				},
			},
			{
				name: 'Transform Image',
				value: 'img2img',
				action: 'Transform an existing image',
				description: 'Modify existing images using AI based on text prompts',
				routing: {
					request: {
						method: 'POST',
						url: '/images/img2img',
					},
					output: {
						postReceive: [processImageResponse],
					},
				},
			},
			{
				name: 'Edit with Mask',
				value: 'inpaint',
				action: 'Edit specific regions using a mask',
				description: 'Edit specific areas of an image using a mask to define regions',
				routing: {
					request: {
						method: 'POST',
						url: '/image_editing/inpaint',
					},
					output: {
						postReceive: [processAsyncResponse],
					},
				},
			},
			{
				name: 'Remove Background',
				value: 'background_removal',
				action: 'Remove image background automatically',
				description: 'Automatically remove the background from images',
				routing: {
					request: {
						method: 'POST',
						url: '/image_editing/background_removal',
					},
					output: {
						postReceive: [processAsyncResponse],
					},
				},
			},
			{
				name: 'Professional Headshot',
				value: 'headshot',
				action: 'Generate professional portrait',
				description: 'Generate high-quality professional headshots',
				routing: {
					request: {
						method: 'POST',
						url: '/image_editing/flux_headshot',
					},
					output: {
						postReceive: [processAsyncResponse],
					},
				},
			},
		],
		routing: {
			output: {
				postReceive: [sendErrorPostReceive],
			},
		},
		default: 'text2img',
	},
];

// Common fields used across operations
const commonFields: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		placeholder: 'A beautiful mountain landscape at sunset with vibrant colors...',
		description: 'Detailed text description of the desired image. Be specific about style, composition, lighting, and subjects.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['text2img', 'img2img', 'inpaint', 'headshot'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
	{
		displayName: 'Model',
		name: 'model_id',
		type: 'options',
		default: 'flux',
		description: 'AI model to use for image generation',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['text2img', 'img2img', 'headshot'],
			},
		},
		options: [
			{
				name: 'Flux (Recommended)',
				value: 'flux',
				description: 'Latest high-quality model with excellent prompt adherence',
			},
			{
				name: 'Stable Diffusion XL',
				value: 'stable-diffusion-xl',
				description: 'Popular open-source model for artistic results',
			},
			{
				name: 'Playground v2.5',
				value: 'playground-v2.5',
				description: 'Creative model for artistic and stylized images',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'model_id',
			},
		},
	},
];

// Image input fields for operations that require existing images
const imageInputFields: INodeProperties[] = [
	{
		displayName: 'Input Image',
		name: 'inputImage',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['img2img', 'inpaint', 'background_removal'],
			},
		},
		default: 'data',
		description: 'The binary property containing the input image from a previous node',
		routing: {
			send: {
				type: 'body',
				property: 'init_image',
				value: '={{ $binary.data ? Buffer.from($binary.data.data).toString("base64") : "" }}',
			},
		},
	},
	{
		displayName: 'Mask Image',
		name: 'maskImage',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['inpaint'],
			},
		},
		default: 'mask',
		description: 'The binary property containing the mask image (white areas will be inpainted)',
		routing: {
			send: {
				type: 'body',
				property: 'mask_image',
				value: '={{ $binary.mask ? Buffer.from($binary.mask.data).toString("base64") : "" }}',
			},
		},
	},
	{
		displayName: 'Strength',
		name: 'strength',
		type: 'number',
		default: 0.7,
		typeOptions: {
			minValue: 0.1,
			maxValue: 1.0,
			numberStepSize: 0.1,
		},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['img2img'],
			},
		},
		description: 'How much to change the original image (0.1 = minimal change, 1.0 = completely new)',
		routing: {
			send: {
				type: 'body',
				property: 'strength',
			},
		},
	},
];

// Advanced options collection
const advancedOptions: INodeProperties[] = [
	{
		displayName: 'Advanced Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['text2img', 'img2img', 'headshot'],
			},
		},
		options: [
			{
				displayName: 'Image Count',
				name: 'samples',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
					maxValue: 4,
				},
				description: 'Number of images to generate (1-4)',
				routing: {
					send: {
						type: 'body',
						property: 'samples',
					},
				},
			},
			{
				displayName: 'Image Size',
				name: 'size',
				type: 'options',
				default: '1024x1024',
				options: [
					{ name: '512×512', value: '512x512' },
					{ name: '768×768', value: '768x768' },
					{ name: '1024×1024 (Square)', value: '1024x1024' },
					{ name: '1024×768 (Landscape)', value: '1024x768' },
					{ name: '768×1024 (Portrait)', value: '768x1024' },
				],
				description: 'Dimensions for the generated image',
				routing: {
					send: {
						preSend: [
							function (this, requestOptions) {
								const size = this.getNodeParameter('options.size', 0, '1024x1024') as string;
								const [width, height] = size.split('x').map(Number);
								requestOptions.body.width = width;
								requestOptions.body.height = height;
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Guidance Scale',
				name: 'guidance_scale',
				type: 'number',
				default: 7.5,
				typeOptions: {
					minValue: 1.0,
					maxValue: 20.0,
					numberStepSize: 0.5,
				},
				description: 'How closely to follow the prompt (1-20). Higher values = stricter adherence.',
				routing: {
					send: {
						type: 'body',
						property: 'guidance_scale',
					},
				},
			},
			{
				displayName: 'Generation Steps',
				name: 'num_inference_steps',
				type: 'number',
				default: 30,
				typeOptions: {
					minValue: 10,
					maxValue: 50,
				},
				description: 'Number of denoising steps. More steps = higher quality but slower generation.',
				routing: {
					send: {
						type: 'body',
						property: 'num_inference_steps',
					},
				},
			},
			{
				displayName: 'Negative Prompt',
				name: 'negative_prompt',
				type: 'string',
				default: '',
				placeholder: 'blurry, low quality, distorted, ugly...',
				description: 'Describe what you DON\'T want in the generated image',
				routing: {
					send: {
						type: 'body',
						property: 'negative_prompt',
					},
				},
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: '',
				description: 'Seed for reproducible results. Leave empty for random generation.',
				routing: {
					send: {
						type: 'body',
						property: 'seed',
						value: '={{ $value ? parseInt($value) : undefined }}',
					},
				},
			},
			{
				displayName: 'Enhance Prompt',
				name: 'enhance_prompt',
				type: 'boolean',
				default: false,
				description: 'Automatically improve and expand your prompt for better results',
				routing: {
					send: {
						type: 'body',
						property: 'enhance_prompt',
					},
				},
			},
			{
				displayName: 'Safety Checker',
				name: 'safety_checker',
				type: 'boolean',
				default: true,
				description: 'Enable content safety filtering',
				routing: {
					send: {
						type: 'body',
						property: 'safety_checker',
						value: '={{ $value ? "yes" : "no" }}',
					},
				},
			},
		],
	},
];

// Headshot-specific options
const headshotOptions: INodeProperties[] = [
	{
		displayName: 'Headshot Options',
		name: 'headshotOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['headshot'],
			},
		},
		options: [
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				default: 'diverse',
				options: [
					{ name: 'Male', value: 'male' },
					{ name: 'Female', value: 'female' },
					{ name: 'Diverse/Any', value: 'diverse' },
				],
				routing: {
					send: {
						type: 'body',
						property: 'gender',
					},
				},
			},
			{
				displayName: 'Age Range',
				name: 'age',
				type: 'string',
				default: '25-35',
				placeholder: '25-35',
				description: 'Age range or specific age description',
				routing: {
					send: {
						type: 'body',
						property: 'age',
					},
				},
			},
			{
				displayName: 'Background',
				name: 'background',
				type: 'string',
				default: 'professional office',
				placeholder: 'professional office with soft lighting',
				description: 'Background setting for the headshot',
				routing: {
					send: {
						type: 'body',
						property: 'background',
					},
				},
			},
			{
				displayName: 'Lighting',
				name: 'lighting',
				type: 'string',
				default: 'professional studio lighting',
				placeholder: 'soft natural lighting',
				description: 'Lighting style and setup',
				routing: {
					send: {
						type: 'body',
						property: 'lighting',
					},
				},
			},
			{
				displayName: 'Expression',
				name: 'expression',
				type: 'string',
				default: 'confident and approachable',
				placeholder: 'warm and friendly',
				description: 'Facial expression and demeanor',
				routing: {
					send: {
						type: 'body',
						property: 'expression',
					},
				},
			},
			{
				displayName: 'Clothing',
				name: 'clothing_type',
				type: 'string',
				default: 'business professional',
				placeholder: 'navy blue business suit',
				description: 'Clothing style and description',
				routing: {
					send: {
						type: 'body',
						property: 'clothing_type',
					},
				},
			},
		],
	},
];

// Output format options for background removal
const outputOptions: INodeProperties[] = [
	{
		displayName: 'Output Format',
		name: 'output_format',
		type: 'options',
		default: 'png',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['background_removal'],
			},
		},
		options: [
			{ name: 'PNG (Supports Transparency)', value: 'png' },
			{ name: 'JPG', value: 'jpg' },
			{ name: 'WebP', value: 'webp' },
		],
		description: 'Output image format. PNG recommended for transparency support.',
		routing: {
			send: {
				type: 'body',
				property: 'output_format',
			},
		},
	},
];

export const imageFields: INodeProperties[] = [
	// Common fields
	...commonFields,
	
	// Image input fields  
	...imageInputFields,
	
	// Advanced options
	...advancedOptions,
	
	// Headshot-specific options
	...headshotOptions,
	
	// Output options
	...outputOptions,
];