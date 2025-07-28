import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Replicate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Replicate',
		name: 'replicate',
		icon: 'file:replicate.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'AI Image Generation',
		description: 'Generate images using Replicate AI models',
		defaults: {
			name: 'Replicate',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'replicateApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'FLUX Schnell',
						value: 'black-forest-labs/flux-schnell',
					},
					{
						name: 'FLUX Pro',
						value: 'black-forest-labs/flux-pro',
					},
					{
						name: 'FLUX Dev',
						value: 'black-forest-labs/flux-dev',
					},
					{
						name: 'FLUX Kontext Pro',
						value: 'black-forest-labs/flux-kontext-pro',
					},
					{
						name: 'Recraft V3',
						value: 'recraft-ai/recraft-v3',
					},
					{
						name: 'Stable Diffusion 3',
						value: 'stability-ai/stable-diffusion-3',
					},
				],
				default: 'black-forest-labs/flux-schnell',
				description: 'The AI model to use for image generation',
			},
			{
				displayName: 'Image Resolution',
				name: 'imageResolution',
				type: 'options',
				displayOptions: {
					show: {
						model: ['recraft-ai/recraft-v3'],
					},
				},
				options: [
					{ name: '1024x1024', value: '1024x1024' },
					{ name: '1365x1024', value: '1365x1024' },
					{ name: '1024x1365', value: '1024x1365' },
					{ name: '1536x1024', value: '1536x1024' },
					{ name: '1024x1536', value: '1024x1536' },
					{ name: '1820x1024', value: '1820x1024' },
					{ name: '1024x1820', value: '1024x1820' },
					{ name: '1024x2048', value: '1024x2048' },
					{ name: '2048x1024', value: '2048x1024' },
					{ name: '1434x1024', value: '1434x1024' },
					{ name: '1024x1434', value: '1024x1434' },
					{ name: '1024x1280', value: '1024x1280' },
					{ name: '1280x1024', value: '1280x1024' },
					{ name: '1024x1707', value: '1024x1707' },
					{ name: '1707x1024', value: '1707x1024' },
				],
				default: '1365x1024',
				description: 'The resolution of the generated image',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				displayOptions: {
					show: {
						model: [
							'black-forest-labs/flux-schnell',
							'black-forest-labs/flux-pro',
							'black-forest-labs/flux-dev',
							'black-forest-labs/flux-kontext-pro',
						],
					},
				},
				options: [
					{ name: '1:1', value: '1:1' },
					{ name: '3:2', value: '3:2' },
					{ name: '2:3', value: '2:3' },
					{ name: '4:3', value: '4:3' },
					{ name: '3:4', value: '3:4' },
					{ name: '16:9', value: '16:9' },
					{ name: '9:16', value: '9:16' },
				],
				default: '1:1',
				description: 'The aspect ratio of the generated image',
			},
			{
				displayName: 'Prompt Field',
				name: 'promptField',
				type: 'string',
				default: 'chatInput',
				description:
					'The field name containing the prompt text (e.g., chatInput, output, message, etc.)',
				placeholder: 'chatInput',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'options',
				displayOptions: {
					show: {
						model: ['stability-ai/stable-diffusion-3'],
					},
				},
				options: [
					{ name: '512', value: 512 },
					{ name: '768', value: 768 },
					{ name: '1024', value: 1024 },
				],
				default: 768,
				description: 'The width of the generated image',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'options',
				displayOptions: {
					show: {
						model: ['stability-ai/stable-diffusion-3'],
					},
				},
				options: [
					{ name: '512', value: 512 },
					{ name: '768', value: 768 },
					{ name: '1024', value: 1024 },
				],
				default: 768,
				description: 'The height of the generated image',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];
				const model = this.getNodeParameter('model', itemIndex) as string;
				console.log(`Selected model: ${model}`); // Log the selected model

				const promptField = this.getNodeParameter('promptField', itemIndex) as string;
				// Access 'imageResolution' only if the model is 'recraft-ai/recraft-v3'
				let imageResolution: string | undefined;
				if (model === 'recraft-ai/recraft-v3') {
					imageResolution = this.getNodeParameter('imageResolution', itemIndex) as string;
				}
				let width: number | undefined;
				let height: number | undefined;
				if (model === 'stability-ai/stable-diffusion-3') {
					width = this.getNodeParameter('width', itemIndex) as number;
					height = this.getNodeParameter('height', itemIndex) as number;
					console.log(`Width: ${width}, Height: ${height}`); // Log width and height
				}

				// Get prompt from input data with fallback logic
				let prompt: string | undefined;

				// First try the specified field
				if (item.json[promptField]) {
					prompt = item.json[promptField] as string;
				} else {
					// Fallback to common field names if the specified field doesn't exist
					const commonFields = ['output', 'message', 'text', 'content', 'input'];

					for (const field of commonFields) {
						if (item.json[field]) {
							prompt = item.json[field] as string;
							break;
						}
					}
				}

				if (!prompt) {
					throw new NodeOperationError(
						this.getNode(),
						`No prompt found in field "${promptField}" or common fallback fields (output, message, text, content, input)`,
						{ itemIndex },
					);
				}

				// Step 1: POST request to start generation
				const postUrl = `https://api.replicate.com/v1/models/${model}/predictions`;
				const postOptions: IHttpRequestOptions = {
					method: 'POST',
					url: postUrl,
					json: true,
				};

				const input: Record<string, any> = { prompt };

				if (model === 'recraft-ai/recraft-v3') {
					input.size = imageResolution;
					input.style = 'any';
					input.aspect_ratio = 'Not set';
				} else if (model === 'stability-ai/stable-diffusion-3') {
					input.width = width;
					input.height = height;
				}

				let aspectRatio: string | undefined;
				if (
					[
						'black-forest-labs/flux-schnell',
						'black-forest-labs/flux-pro',
						'black-forest-labs/flux-dev',
						'black-forest-labs/flux-kontext-pro',
					].includes(model)
				) {
					aspectRatio = this.getNodeParameter('aspectRatio', itemIndex) as string;
					input.aspect_ratio = aspectRatio;
				}

				console.log(`Input object: ${JSON.stringify(input)}`); // Log the input object

				// Use the input object in the request body
				postOptions.body = { input };

				const predictionResponse = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'replicateApi',
					postOptions,
				);

				// Step 2: Code execution - extract image URL
				// Simulating the code: const output = $input.first().json.urls?.[0] || $input.first().json.output?.[0]
				let imageUrl: string | undefined;

				// Check various possible response formats from Replicate
				if (
					predictionResponse.urls &&
					Array.isArray(predictionResponse.urls) &&
					predictionResponse.urls.length > 0
				) {
					imageUrl = predictionResponse.urls[0];
				} else if (
					predictionResponse.output &&
					Array.isArray(predictionResponse.output) &&
					predictionResponse.output.length > 0
				) {
					imageUrl = predictionResponse.output[0];
				} else if (typeof predictionResponse.output === 'string') {
					imageUrl = predictionResponse.output;
				}

				if (!imageUrl) {
					// If no immediate URL, we need to wait for the prediction to complete
					const predictionId = predictionResponse.id;
					if (!predictionId) {
						throw new NodeOperationError(
							this.getNode(),
							'No prediction ID returned from Replicate API',
							{ itemIndex },
						);
					}

					// Poll for completion (with timeout)
					let attempts = 0;
					const maxAttempts = 30; // 5 minutes max wait time
					const pollInterval = 10000; // 10 seconds

					while (attempts < maxAttempts) {
						await new Promise((resolve) => setTimeout(resolve, pollInterval));

						const statusOptions: IHttpRequestOptions = {
							method: 'GET',
							url: `https://api.replicate.com/v1/predictions/${predictionId}`,
							json: true,
						};

						const statusResponse = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'replicateApi',
							statusOptions,
						);

						if (statusResponse.status === 'succeeded') {
							if (
								statusResponse.output &&
								Array.isArray(statusResponse.output) &&
								statusResponse.output.length > 0
							) {
								imageUrl = statusResponse.output[0];
								break;
							} else if (typeof statusResponse.output === 'string') {
								imageUrl = statusResponse.output;
								break;
							}
						} else if (statusResponse.status === 'failed' || statusResponse.status === 'canceled') {
							throw new NodeOperationError(
								this.getNode(),
								`Image generation failed: ${statusResponse.error || 'Unknown error'}`,
								{ itemIndex },
							);
						}

						attempts++;
					}

					if (!imageUrl) {
						throw new NodeOperationError(
							this.getNode(),
							'Timeout waiting for image generation to complete',
							{ itemIndex },
						);
					}
				}

				// Step 3: Download image as binary data
				const imageBuffer = (await this.helpers.httpRequest({
					method: 'GET',
					url: imageUrl,
					json: false,
					encoding: 'arraybuffer',
				})) as Buffer;

				// Create binary data
				const mimeType = 'image/png'; // Default to PNG, could be detected from URL extension
				const fileName = `generated-image-${Date.now()}.png`;

				const binaryData = await this.helpers.prepareBinaryData(imageBuffer, fileName, mimeType);

				// Return result with both JSON metadata and binary image
				const result: INodeExecutionData = {
					json: {
						...item.json,
						replicate: {
							model,
							prompt,
							imageUrl,
							predictionId: predictionResponse.id,
							status: 'completed',
						},
					},
					binary: {
						data: binaryData,
					},
					pairedItem: {
						item: itemIndex,
					},
				};

				returnData.push(result);
			} catch (error) {
				if (this.continueOnFail()) {
					const result: INodeExecutionData = {
						json: {
							...items[itemIndex].json,
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					};
					returnData.push(result);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
