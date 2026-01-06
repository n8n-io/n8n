import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

function isJsonObjectOrString(value: unknown): value is JsonObject | string {
	return (
		typeof value === 'string' ||
		(value !== null && typeof value === 'object' && !Array.isArray(value))
	);
}

function isJsonObject(value: unknown): value is JsonObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const errorBody = isJsonObject(response.body) ? response.body : {};
		const error = isJsonObject(errorBody.error) ? errorBody.error : {};

		const errorMessage =
			typeof error.message === 'string'
				? error.message
				: (response.statusMessage ?? 'An unexpected issue occurred');
		const errorType = typeof error.type === 'string' ? error.type : 'UnknownError';
		const itemIndex = typeof error.itemIndex === 'number' ? `[Item ${error.itemIndex}]` : '';

		switch (errorType) {
			case 'invalid_model':
				throw new NodeApiError(this.getNode(), errorBody, {
					message: `Invalid model selected${itemIndex ? ' ' + itemIndex : ''}`,
					description:
						'The selected model is not valid. Valid models are: sonar, sonar-pro, sonar-deep-research, sonar-reasoning-pro. See https://docs.perplexity.ai/getting-started/models for details.',
				});

			case 'invalid_request_error':
				if (errorMessage.toLowerCase().includes('reasoning_effort')) {
					throw new NodeApiError(this.getNode(), errorBody, {
						message: 'Invalid parameter combination',
						description:
							'The reasoning_effort parameter can only be used with the sonar-deep-research model. Please select the correct model or remove this parameter.',
					});
				}
				if (
					errorMessage.toLowerCase().includes('search_type') &&
					errorMessage.toLowerCase().includes('stream')
				) {
					throw new NodeApiError(this.getNode(), errorBody, {
						message: 'Pro Search requires streaming',
						description:
							'Pro Search (search_type: "pro") requires streaming to be enabled. Please enable the "Stream Response" option.',
					});
				}
				break;

			case 'rate_limit_exceeded':
				throw new NodeApiError(this.getNode(), errorBody, {
					message: 'Rate limit exceeded',
					description:
						'Too many requests. Please check your usage tier and rate limits at https://docs.perplexity.ai/guides/rate-limits-usage-tiers.',
				});

			case 'insufficient_permissions':
				throw new NodeApiError(this.getNode(), errorBody, {
					message: 'Insufficient permissions',
					description:
						'Your API key does not have permission for this feature. Check your usage tier at https://docs.perplexity.ai/guides/rate-limits-usage-tiers.',
				});

			case 'billing_limit_exceeded':
				throw new NodeApiError(this.getNode(), errorBody, {
					message: 'Billing limit exceeded',
					description:
						'You have exceeded your billing limit. Please check your account settings and billing information.',
				});
		}

		if (
			errorMessage.toLowerCase().includes('search') ||
			errorType.toLowerCase().includes('search')
		) {
			throw new NodeApiError(this.getNode(), errorBody, {
				message: `Search API error: ${errorMessage}${itemIndex ? ' ' + itemIndex : ''}`,
				description:
					'Please check your search parameters. For Search API documentation, see: https://docs.perplexity.ai/api-reference/search-post',
			});
		}

		// Fallback for other errors
		throw new NodeApiError(this.getNode(), errorBody, {
			message: `${errorMessage}${itemIndex ? ' ' + itemIndex : ''}.`,
			description:
				'Please check your message format and parameters. For Chat Completions API documentation, see: https://docs.perplexity.ai/api-reference/chat-completions-post',
		});
	}
	return data;
}

export function validateModelParameters(
	this: IExecuteSingleFunctions,
	parameters: Record<string, unknown>,
): void {
	const model = typeof parameters.model === 'string' ? parameters.model : '';
	const reasoningEffort =
		typeof parameters.reasoningEffort === 'string' ? parameters.reasoningEffort : '';
	const webSearchOptions =
		parameters.webSearchOptions && typeof parameters.webSearchOptions === 'object'
			? (parameters.webSearchOptions as Record<string, unknown>)
			: undefined;
	const searchType =
		typeof webSearchOptions?.searchType === 'string' ? webSearchOptions.searchType : undefined;
	const stream = typeof parameters.stream === 'boolean' ? parameters.stream : false;

	if (reasoningEffort && model !== 'sonar-deep-research') {
		throw new NodeOperationError(
			this.getNode(),
			'The reasoning_effort parameter can only be used with the sonar-deep-research model',
		);
	}

	if (searchType === 'pro' && !stream) {
		throw new NodeOperationError(
			this.getNode(),
			'Pro Search (search_type: "pro") requires streaming to be enabled. Please enable the "Stream Response" option.',
		);
	}
}

export async function processProSearchResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	return items.map((item) => {
		if (!isJsonObjectOrString(item.json)) {
			return item;
		}

		const json = item.json;

		// Format: "data: {...}\r\n\r\ndata: {...}\r\n\r\ndata: {...}"
		if (typeof json === 'string') {
			const chunks = parseSSEString(json);
			if (chunks.length > 0) {
				return processChunkArray(chunks, item);
			}
			return item;
		}

		return processSingleResponse(json, item);
	});
}

function parseSSEString(str: string): JsonObject[] {
	if (typeof str !== 'string') return [];

	const chunks: JsonObject[] = [];

	const sseEvents = str.split(/\r?\n\r?\n/);

	for (const event of sseEvents) {
		const trimmed = event.trim();
		if (!trimmed || !trimmed.startsWith('data:')) continue;

		const jsonStr = trimmed.slice(5).trim();

		if (!jsonStr || jsonStr === '[DONE]') continue;

		try {
			const parsed: unknown = JSON.parse(jsonStr);
			if (isJsonObject(parsed)) {
				chunks.push(parsed);
			}
		} catch {
			continue;
		}
	}

	return chunks;
}

function processChunkArray(
	chunks: unknown[],
	originalItem: INodeExecutionData,
): INodeExecutionData {
	let accumulatedContent = '';
	const allReasoningSteps: JsonObject[] = [];
	const allSearchResults: JsonObject[] = [];
	const allImages: JsonObject[] = [];
	let finalChunk: JsonObject | null = null;
	let id = '';
	let model = '';
	let created = 0;

	for (const chunk of chunks) {
		if (!isJsonObject(chunk)) continue;
		const chunkObj = chunk;
		const objectType = typeof chunkObj.object === 'string' ? chunkObj.object : '';

		if (chunkObj.id && typeof chunkObj.id === 'string') id = chunkObj.id;
		if (chunkObj.model && typeof chunkObj.model === 'string') model = chunkObj.model;
		if (typeof chunkObj.created === 'number') created = chunkObj.created;

		if (objectType === 'chat.completion.chunk' || objectType === 'chat.completion.done') {
			const choices = Array.isArray(chunkObj.choices) ? chunkObj.choices : [];
			const firstChoice = isJsonObject(choices[0]) ? choices[0] : undefined;
			if (firstChoice) {
				const message = isJsonObject(firstChoice.message) ? firstChoice.message : undefined;
				const delta = isJsonObject(firstChoice.delta) ? firstChoice.delta : undefined;

				if (message?.content && typeof message.content === 'string') {
					accumulatedContent = message.content;
				} else if (delta?.content && typeof delta.content === 'string') {
					accumulatedContent += delta.content;
				}

				if (Array.isArray(message?.reasoning_steps)) {
					allReasoningSteps.push(...message.reasoning_steps.filter(isJsonObject));
				}
			}

			if (Array.isArray(chunkObj.search_results)) {
				allSearchResults.push(...chunkObj.search_results.filter(isJsonObject));
			}

			if (objectType === 'chat.completion.chunk' || objectType === 'chat.completion.done') {
				finalChunk = chunkObj;
			}
		}

		if (objectType === 'chat.reasoning' || objectType === 'chat.reasoning.done') {
			const choices = Array.isArray(chunkObj.choices) ? chunkObj.choices : [];
			const firstChoice = isJsonObject(choices[0]) ? choices[0] : undefined;
			if (firstChoice) {
				const delta = isJsonObject(firstChoice.delta) ? firstChoice.delta : undefined;
				if (Array.isArray(delta?.reasoning_steps)) {
					allReasoningSteps.push(...delta.reasoning_steps.filter(isJsonObject));
				}
			}

			if (objectType === 'chat.reasoning.done') {
				if (Array.isArray(chunkObj.search_results)) {
					allSearchResults.push(...chunkObj.search_results.filter(isJsonObject));
				}
				if (Array.isArray(chunkObj.images)) {
					allImages.push(...chunkObj.images.filter(isJsonObject));
				}
			}
		}
	}

	for (const step of allReasoningSteps) {
		if (step.type === 'web_search' && isJsonObject(step.web_search)) {
			const webSearch = step.web_search;
			if (Array.isArray(webSearch.search_results)) {
				allSearchResults.push(...webSearch.search_results.filter(isJsonObject));
			}
		}
	}

	const finalResponse: JsonObject = {
		id: id || ((finalChunk?.id as string | undefined) ?? ''),
		model: model || ((finalChunk?.model as string | undefined) ?? ''),
		created: created || ((finalChunk?.created as number | undefined) ?? 0),
		object: 'chat.completion',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content: accumulatedContent,
					...(allReasoningSteps.length > 0 && { reasoning_steps: allReasoningSteps }),
				},
			},
		],
		...(allSearchResults.length > 0 && { search_results: allSearchResults }),
		...(allImages.length > 0 && { images: allImages }),
		...(finalChunk?.usage && { usage: finalChunk.usage }),
	};

	return {
		...originalItem,
		json: finalResponse,
	};
}

function processSingleResponse(
	responseData: JsonObject,
	originalItem: INodeExecutionData,
): INodeExecutionData {
	const objectType = typeof responseData.object === 'string' ? responseData.object : '';
	const choices = Array.isArray(responseData.choices) ? responseData.choices : [];
	const firstChoice = isJsonObject(choices[0]) ? choices[0] : undefined;
	const message = isJsonObject(firstChoice?.message) ? firstChoice.message : undefined;
	const delta = isJsonObject(firstChoice?.delta) ? firstChoice.delta : undefined;

	const hasReasoningSteps =
		objectType === 'chat.reasoning' ||
		objectType === 'chat.reasoning.done' ||
		objectType === 'chat.completion.chunk' ||
		objectType === 'chat.completion.done' ||
		(Array.isArray(message?.reasoning_steps) && message.reasoning_steps.length > 0) ||
		(Array.isArray(delta?.reasoning_steps) && delta.reasoning_steps.length > 0);

	if (!hasReasoningSteps) {
		return originalItem;
	}

	let content = '';
	if (message?.content && typeof message.content === 'string') {
		content = message.content;
	} else if (delta?.content && typeof delta.content === 'string') {
		content = delta.content;
	}

	const reasoningSteps: JsonObject[] = [];
	if (Array.isArray(message?.reasoning_steps)) {
		reasoningSteps.push(...message.reasoning_steps.filter(isJsonObject));
	} else if (Array.isArray(delta?.reasoning_steps)) {
		reasoningSteps.push(...delta.reasoning_steps.filter(isJsonObject));
	}

	const searchResults: JsonObject[] = [];
	if (Array.isArray(responseData.search_results)) {
		searchResults.push(...responseData.search_results.filter(isJsonObject));
	}

	for (const step of reasoningSteps) {
		if (step.type === 'web_search' && isJsonObject(step.web_search)) {
			const webSearch = step.web_search;
			if (Array.isArray(webSearch.search_results)) {
				searchResults.push(...webSearch.search_results.filter(isJsonObject));
			}
		}
	}

	const images: JsonObject[] = [];
	if (Array.isArray(responseData.images)) {
		images.push(...responseData.images.filter(isJsonObject));
	}

	const enhancedJson: JsonObject = {
		...responseData,
		content: content || (typeof responseData.content === 'string' ? responseData.content : ''),
		...(reasoningSteps.length > 0 && { reasoning_steps: reasoningSteps }),
		...(searchResults.length > 0 && { search_results: searchResults }),
		...(images.length > 0 && { images }),
	};

	if (Array.isArray(responseData.choices)) {
		enhancedJson.choices = responseData.choices.filter(isJsonObject).map((choice) => {
			const choiceMessage = isJsonObject(choice.message) ? choice.message : undefined;
			return {
				...choice,
				message: {
					...(choiceMessage ?? {}),
					content:
						content || (typeof choiceMessage?.content === 'string' ? choiceMessage.content : ''),
					...(reasoningSteps.length > 0 && { reasoning_steps: reasoningSteps }),
				},
			};
		});
	}

	return {
		...originalItem,
		json: enhancedJson,
	};
}
