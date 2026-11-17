import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { processJsonInput } from '@utils/utilities';

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
					'The model is not valid. Permitted models can be found in the documentation at https://docs.perplexity.ai/docs/agent-api/models.',
			});
		}

		// Fallback for other errors
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
			message: `${errorMessage}${itemIndex ? ' ' + itemIndex : ''}.`,
			description:
				'Any optional system messages must be sent first, followed by alternating user and assistant messages. For more details, refer to the API documentation: https://docs.perplexity.ai/api-reference/agent-post',
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

export const decisionsErrorPostReceive = createErrorHandler(
	'Refer to the Decisions API documentation at https://docs.perplexity.ai/api-reference/decisions-post for valid parameters.',
);

interface DecisionQuestionFields {
	name: string;
	type: 'choice' | 'locate' | 'noul' | 'score';
	instructions: string;
	criteria: string | object;
}

const reservedKeys = new Set(['__proto__', 'constructor', 'prototype']);

const hasReservedKey = (value: unknown): boolean => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.entries(value).some(
		([key, nested]) => reservedKeys.has(key) || hasReservedKey(nested),
	);
};

export async function decisionsPreSend(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = requestOptions.body as IDataObject;

	if (this.getNodeParameter('stateType') === 'json') {
		body.state = processJsonInput(this.getNodeParameter('stateJson'), 'State') as IDataObject;
	}

	if (hasReservedKey(body.state)) {
		throw new NodeOperationError(
			this.getNode(),
			'State keys cannot be named __proto__, constructor or prototype',
			{
				description:
					'The request would be sent without this key. Rename the key, or set State Type to Text.',
			},
		);
	}

	if (this.getNodeParameter('defineQuestions') === 'json') {
		body.questions = processJsonInput(
			this.getNodeParameter('questionsJson'),
			'Questions',
		) as IDataObject;
	} else {
		const fields = this.getNodeParameter('questions.values', []) as DecisionQuestionFields[];
		const questions = new Map<string, IDataObject>();

		for (const { name, type, instructions, criteria } of fields) {
			if (questions.has(name)) {
				throw new NodeOperationError(this.getNode(), 'Question names must be unique', {
					description: 'The API returns one answer per question name. Rename the duplicate.',
				});
			}

			const question: IDataObject = { type };
			if (instructions) question.instructions = instructions;
			if (type === 'choice' || type === 'score') {
				question.criteria = processJsonInput(criteria, 'Criteria') as IDataObject;
			}
			questions.set(name, question);
		}

		body.questions = Object.fromEntries(questions);
	}

	if (hasReservedKey(body.questions)) {
		throw new NodeOperationError(
			this.getNode(),
			'Question names and criteria keys cannot be __proto__, constructor or prototype',
			{
				description:
					'The request would be sent without this key. Rename the question or the option.',
			},
		);
	}

	return requestOptions;
}

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
