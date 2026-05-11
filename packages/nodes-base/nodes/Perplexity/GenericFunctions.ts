import type {
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
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

		// Fallback for other errors
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: `${errorMessage}${itemIndex ? ' ' + itemIndex : ''}.`,
			description:
				'Any optional system messages must be sent first, followed by alternating user and assistant messages. For more details, refer to the API documentation: https://docs.perplexity.ai/api-reference/chat-completions',
		});
	}
	return data;
}

const createErrorHandler = (description: string) =>
	async function (
		this: IExecuteSingleFunctions,
		data: INodeExecutionData[],
		{ statusCode, body, statusMessage }: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		if (statusCode >= 400 && statusCode <= 599) {
			const errorBody = body as JsonObject;
			const error = (errorBody?.error ?? errorBody) as JsonObject;
			const errorMessage =
				typeof error.message === 'string'
					? error.message
					: (statusMessage ?? 'An unexpected issue occurred');

			throw new NodeApiError(this.getNode(), errorBody, { message: errorMessage, description });
		}
		return data;
	};

export const agentErrorPostReceive = createErrorHandler(
	'Refer to the Agent API documentation at https://docs.perplexity.ai/api-reference/agent-post for valid parameters.',
);

export const searchErrorPostReceive = createErrorHandler(
	'Refer to the Search API documentation at https://docs.perplexity.ai/api-reference/search-post for valid parameters.',
);

export const embeddingsErrorPostReceive = createErrorHandler(
	'Refer to the Embeddings API documentation at https://docs.perplexity.ai/api-reference/embeddings-post for valid parameters.',
);

export async function getAgentModels(
	this: ILoadOptionsFunctions,
	filter: string = '',
): Promise<INodeListSearchResult> {
	const response = (await this.helpers.requestWithAuthentication.call(this, 'perplexityApi', {
		method: 'GET',
		url: 'https://api.perplexity.ai/v1/models',
		json: true,
	})) as { data?: Array<{ id: string; owned_by: string }> };

	const models = response.data ?? [];

	const results = models
		.map((model) => ({
			name: model.id,
			value: model.id,
			url: 'https://docs.perplexity.ai/docs/agent-api/models',
		}))
		.filter((item) => !filter || item.name.toLowerCase().includes(filter.toLowerCase()));

	return { results };
}
