/**
 * Utility functions for working with n8n AI interfaces
 */

import type { IN8nAiMessage, IN8nToolParameter, IN8nToolSchema } from './interfaces';
import { N8nAiMessageRole } from './interfaces';

/**
 * Create a human message
 * @param content - Message content
 * @param name - Optional sender name
 * @returns Human message object
 */
export function createHumanMessage(content: string, name?: string): IN8nAiMessage {
	return {
		role: N8nAiMessageRole.Human,
		content,
		...(name && { name }),
	};
}

/**
 * Create an AI message
 * @param content - Message content
 * @param name - Optional AI name
 * @returns AI message object
 */
export function createAiMessage(content: string, name?: string): IN8nAiMessage {
	return {
		role: N8nAiMessageRole.AI,
		content,
		...(name && { name }),
	};
}

/**
 * Create a system message
 * @param content - Message content
 * @returns System message object
 */
export function createSystemMessage(content: string): IN8nAiMessage {
	return {
		role: N8nAiMessageRole.System,
		content,
	};
}

/**
 * Convert a simple string prompt into a message array
 * @param prompt - User prompt
 * @param systemPrompt - Optional system prompt
 * @returns Array of messages
 */
export function promptToMessages(prompt: string, systemPrompt?: string): IN8nAiMessage[] {
	const messages: IN8nAiMessage[] = [];

	if (systemPrompt) {
		messages.push(createSystemMessage(systemPrompt));
	}

	messages.push(createHumanMessage(prompt));

	return messages;
}

/**
 * Extract text content from a message or array of messages
 * @param messages - Single message or array of messages
 * @returns Combined text content
 */
export function extractMessageContent(messages: IN8nAiMessage | IN8nAiMessage[]): string {
	if (Array.isArray(messages)) {
		return messages.map((m) => m.content).join('\n\n');
	}
	return messages.content;
}

/**
 * Filter messages by role
 * @param messages - Array of messages
 * @param role - Role to filter by
 * @returns Filtered messages
 */
export function filterMessagesByRole(
	messages: IN8nAiMessage[],
	role: N8nAiMessageRole,
): IN8nAiMessage[] {
	return messages.filter((m) => m.role === role);
}

/**
 * Get the last N messages from a conversation
 * @param messages - Array of messages
 * @param count - Number of messages to return
 * @returns Last N messages
 */
export function getLastMessages(messages: IN8nAiMessage[], count: number): IN8nAiMessage[] {
	return messages.slice(-count);
}

/**
 * Trim conversation history while preserving system messages
 * @param messages - Array of messages
 * @param maxMessages - Maximum number of non-system messages to keep
 * @returns Trimmed message array
 */
export function trimConversationHistory(
	messages: IN8nAiMessage[],
	maxMessages: number,
): IN8nAiMessage[] {
	const systemMessages = filterMessagesByRole(messages, N8nAiMessageRole.System);
	const otherMessages = messages.filter((m) => m.role !== N8nAiMessageRole.System);

	const trimmedOthers = otherMessages.slice(-maxMessages);

	return [...systemMessages, ...trimmedOthers];
}

/**
 * Create a simple tool schema from parameter definitions
 * @param parameters - Array of parameter definitions
 * @returns Tool schema object
 */
export function createToolSchema(parameters: IN8nToolParameter[]): IN8nToolSchema {
	return { parameters };
}

/**
 * Validate tool input against schema
 * @param input - Tool input object
 * @param schema - Tool schema
 * @returns Validation result with errors
 */
export function validateToolInput(
	input: Record<string, unknown>,
	schema: IN8nToolSchema,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	for (const param of schema.parameters) {
		const value = input[param.name];

		// Check required parameters
		if (param.required && (value === undefined || value === null)) {
			errors.push(`Required parameter "${param.name}" is missing`);
			continue;
		}

		// Skip validation if value is not provided and not required
		if (value === undefined || value === null) {
			continue;
		}

		// Type validation
		const actualType = Array.isArray(value) ? 'array' : typeof value;
		if (actualType !== param.type && param.type !== 'object') {
			errors.push(`Parameter "${param.name}" should be of type ${param.type}, got ${actualType}`);
		}

		// Enum validation
		if (param.enum && !param.enum.includes(value)) {
			errors.push(
				`Parameter "${param.name}" must be one of: ${param.enum.map((v) => JSON.stringify(v)).join(', ')}`,
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Format tool schema as a human-readable string
 * @param schema - Tool schema
 * @returns Formatted schema description
 */
export function formatToolSchema(schema: IN8nToolSchema): string {
	if (schema.parameters.length === 0) {
		return 'No parameters';
	}

	return schema.parameters
		.map((param) => {
			const required = param.required ? ' (required)' : ' (optional)';
			const defaultValue = param.default !== undefined ? ` [default: ${param.default}]` : '';
			return `  ${param.name}: ${param.type}${required}${defaultValue}\n    ${param.description}`;
		})
		.join('\n');
}

/**
 * Convert messages to a simple conversation string format
 * Useful for debugging or logging
 * @param messages - Array of messages
 * @returns Formatted conversation string
 */
export function formatConversation(messages: IN8nAiMessage[]): string {
	return messages
		.map((msg) => {
			const roleName = msg.role.toUpperCase();
			const name = msg.name ? ` (${msg.name})` : '';
			return `${roleName}${name}: ${msg.content}`;
		})
		.join('\n\n');
}

/**
 * Estimate token count for messages (rough approximation)
 * This is a very rough estimate: ~4 chars per token
 * For accurate counts, use a proper tokenizer
 * @param messages - Array of messages
 * @returns Estimated token count
 */
export function estimateTokenCount(messages: IN8nAiMessage[]): number {
	const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
	return Math.ceil(totalChars / 4);
}
