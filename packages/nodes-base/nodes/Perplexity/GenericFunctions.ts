import type {
	ICredentialDataDecryptedObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const errorBody = response.body as JsonObject;
		const error = (errorBody?.error ?? {}) as JsonObject;

		const errorMessage =
			typeof error.message === 'string'
				? error.message
				: (response.statusMessage ?? 'An unexpected issue occurred');
		const errorType = typeof error.type === 'string' ? error.type : 'UnknownError';
		const itemIndex = typeof error.itemIndex === 'number' ? `[Item ${error.itemIndex}]` : '';

		if (errorType === 'invalid_model') {
			throw new NodeApiError(this.getNode(), errorBody, {
				message: 'Invalid model',
				description:
					'The model is not valid. Permitted models can be found in the documentation at https://docs.perplexity.ai/guides/model-cards.',
			});
		}

		if (errorType === 'invalid_parameter') {
			throw new NodeApiError(this.getNode(), errorBody, {
				message: `${errorType} ${errorMessage}`,
				description:
					'Please check all input parameters and ensure they are correctly formatted. Valid values can be found in the documentation at https://docs.perplexity.ai/api-reference/chat-completions.',
			});
		}

		// Fallback for other errors
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: `${errorMessage} ${itemIndex}.`,
			description:
				'Please check the request parameters and ensure they are correct.For more details, refer to the API documentation: https://docs.perplexity.ai/api-reference/chat-completions.',
		});
	}
	return data;
}

export function getBaseUrl(credentials: ICredentialDataDecryptedObject): string {
	const baseUrl = credentials.baseUrl as string;
	return baseUrl ? baseUrl.replace(/\/$/, '') : 'https://api.perplexity.ai';
}

export async function getModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const models: INodePropertyOptions[] = [
		{
			name: 'R1-1776',
			value: 'r1-1776',
		},
		{
			name: 'Sonar',
			value: 'sonar',
		},
		{
			name: 'Sonar Deep Research',
			value: 'sonar-deep-research',
		},
		{
			name: 'Sonar Pro',
			value: 'sonar-pro',
		},
		{
			name: 'Sonar Reasoning',
			value: 'sonar-reasoning',
		},
		{
			name: 'Sonar Reasoning Pro',
			value: 'sonar-reasoning-pro',
		},
	];

	const filteredModels = filter
		? models.filter((model) => model.name.toLowerCase().includes(filter.toLowerCase()))
		: models;

	return {
		results: filteredModels,
	};
}
