import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export interface ModelsLabImageResponse {
	status: string;
	output?: string[];
	message?: string;
	generationTime?: number;
	id?: string;
	meta?: {
		model_id?: string;
		seed?: number;
		width?: number;
		height?: number;
		[key: string]: any;
	};
}

export interface ModelsLabAsyncResponse {
	status: string;
	id: string;
	message?: string;
}

/**
 * Make an API request to ModelsLab
 */
export async function modelsLabApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('modelsLabApi');

	const options: IRequestOptions = {
		method,
		body: {
			key: credentials.apiKey,
			...body,
		},
		uri: `https://modelslab.com/api/v6${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as Error);
	}
}

/**
 * Download image from URL and return buffer
 */
async function downloadImage(this: IExecuteFunctions, imageUrl: string): Promise<Buffer> {
	try {
		const response = await this.helpers.request({
			method: 'GET',
			uri: imageUrl,
			encoding: null, // Return buffer
		});
		return Buffer.from(response);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as Error, {
			message: `Failed to download image from ${imageUrl}`,
		});
	}
}

/**
 * Poll for async operation result
 */
async function pollForResult(
	this: IExecuteFunctions,
	requestId: string,
	maxWaitTime: number = 300000, // 5 minutes
	pollInterval: number = 2000, // 2 seconds
): Promise<ModelsLabImageResponse> {
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitTime) {
		const response = await modelsLabApiRequest.call(
			this,
			'GET',
			`/image_editing/fetch/${requestId}`,
		);

		if (response.status === 'success' || response.status === 'error') {
			return response;
		}

		// Wait before next poll
		await new Promise((resolve) => setTimeout(resolve, pollInterval));
	}

	throw new NodeApiError(this.getNode(), new Error('ModelsLab operation timed out'), {
		message: `Operation ${requestId} timed out after ${maxWaitTime / 1000} seconds`,
	});
}

/**
 * Process synchronous image response
 */
export async function processImageResponse(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];

	for (const item of items) {
		const response = item.json as ModelsLabImageResponse;

		if (response.status === 'success' && response.output) {
			// Handle multiple images
			for (let i = 0; i < response.output.length; i++) {
				const imageUrl = response.output[i];
				
				// Determine if it's a URL or base64
				let imageBuffer: Buffer;
				if (imageUrl.startsWith('http')) {
					imageBuffer = await downloadImage.call(this, imageUrl);
				} else {
					// Base64 encoded image
					imageBuffer = Buffer.from(imageUrl, 'base64');
				}

				result.push({
					json: {
						imageUrl: imageUrl.startsWith('http') ? imageUrl : 'base64_data',
						generationTime: response.generationTime || 0,
						modelUsed: response.meta?.model_id || 'unknown',
						seed: response.meta?.seed,
						width: response.meta?.width,
						height: response.meta?.height,
						requestId: response.id,
					},
					binary: {
						data: await this.helpers.prepareBinaryData(
							imageBuffer,
							`generated_image_${i + 1}.png`,
						),
					},
				});
			}
		} else if (response.status === 'error') {
			throw new NodeApiError(this.getNode(), new Error(response.message || 'Unknown error'), {
				message: `ModelsLab API Error: ${response.message || 'Unknown error'}`,
			});
		} else {
			throw new NodeApiError(this.getNode(), new Error('Invalid response format'), {
				message: 'Received invalid response from ModelsLab API',
			});
		}
	}

	return result;
}

/**
 * Process asynchronous response with polling
 */
export async function processAsyncResponse(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const result: INodeExecutionData[] = [];

	for (const item of items) {
		const response = item.json as ModelsLabAsyncResponse | ModelsLabImageResponse;

		if (response.status === 'processing' && 'id' in response) {
			// Poll for result
			const finalResult = await pollForResult.call(this, response.id);

			if (finalResult.status === 'success' && finalResult.output) {
				for (let i = 0; i < finalResult.output.length; i++) {
					const imageUrl = finalResult.output[i];
					
					let imageBuffer: Buffer;
					if (imageUrl.startsWith('http')) {
						imageBuffer = await downloadImage.call(this, imageUrl);
					} else {
						imageBuffer = Buffer.from(imageUrl, 'base64');
					}

					result.push({
						json: {
							imageUrl: imageUrl.startsWith('http') ? imageUrl : 'base64_data',
							generationTime: finalResult.generationTime || 0,
							modelUsed: finalResult.meta?.model_id || 'unknown',
							seed: finalResult.meta?.seed,
							requestId: response.id,
						},
						binary: {
							data: await this.helpers.prepareBinaryData(
								imageBuffer,
								`generated_image_${i + 1}.png`,
							),
						},
					});
				}
			} else if (finalResult.status === 'error') {
				throw new NodeApiError(this.getNode(), new Error(finalResult.message || 'Unknown error'), {
					message: `ModelsLab Generation Failed: ${finalResult.message || 'Unknown error'}`,
				});
			}
		} else {
			// Handle immediate response
			return await processImageResponse.call(this, [item]);
		}
	}

	return result;
}

/**
 * Send error post receive handler
 */
export async function sendErrorPostReceive(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items;
}