import { toJsonValue, type JSONValue } from '@n8n/utils/json/to-json-value';
import { NodeApiError, LoggerProxy } from 'n8n-workflow';
import type { IDataObject, INode, JsonObject } from 'n8n-workflow';

/**
 * Looks for body in the error object in the following order:
 * 1. error.response.data
 * 2. error.response.body
 * 3. error.error - body is here, when legacy http handler is used
 * 4. error.body
 *
 */
function getResponseBody(error: JsonObject): unknown {
	const response = error.response;
	if (response !== null && typeof response === 'object' && !Array.isArray(response)) {
		const responseData = response;
		if (Object.hasOwn(responseData, 'data')) {
			return responseData.data;
		}
		if (Object.hasOwn(responseData, 'body')) {
			return responseData.body;
		}
	}

	if (Object.hasOwn(error, 'error')) {
		return error.error;
	}
	if (Object.hasOwn(error, 'body')) {
		return error.body;
	}

	return undefined;
}

function parseErrorResponseBody(body: unknown): JSONValue {
	const jsonSafeBody = toJsonValue(body);
	if (typeof jsonSafeBody !== 'string') {
		return jsonSafeBody;
	}

	try {
		return toJsonValue(JSON.parse(jsonSafeBody));
	} catch {
		return jsonSafeBody;
	}
}

export function createErrorDetails(
	node: INode,
	reason: JsonObject,
	itemIndex: number,
): IDataObject | null {
	try {
		const responseBody = parseErrorResponseBody(getResponseBody(reason));
		const error = new NodeApiError(node, reason, { itemIndex });

		return {
			message: error.message,
			...(error.description && { description: error.description }),
			httpCode: error.httpCode,
			body: responseBody,
			context: error.context,
		};
	} catch (error) {
		LoggerProxy.warn('Failed to parse error response body', { error });
		return null;
	}
}
