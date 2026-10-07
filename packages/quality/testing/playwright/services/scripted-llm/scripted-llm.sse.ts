import type { ScriptToolCall } from './scripted-llm.types';

export type ReplyTextBlock = { type: 'text'; text: string };
export type ReplyToolUseBlock = {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
};
export type ReplyBlock = ReplyTextBlock | ReplyToolUseBlock;

export type StopReason = 'end_turn' | 'tool_use';

/** A complete assistant message before it is sent as JSON or as SSE. */
export type ScriptedMessage = {
	id: string;
	model: string;
	content: ReplyBlock[];
	inputTokens: number;
};

export type SseEvent = { event: string; data: Record<string, unknown> };

// Long text goes out in more than one delta, so that clients see real streaming.
const TEXT_CHUNK_SIZE = 64;

/** A rough and deterministic token count: about four characters for each token. */
export function estimateTokens(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4));
}

/** Text first, then the tool calls. `nextToolId` gives each tool call its id. */
export function toReplyBlocks(
	text: string | undefined,
	toolCalls: ScriptToolCall[],
	nextToolId: () => string,
): ReplyBlock[] {
	const blocks: ReplyBlock[] = text === undefined ? [] : [{ type: 'text', text }];
	for (const call of toolCalls) {
		blocks.push({ type: 'tool_use', id: nextToolId(), name: call.name, input: call.input });
	}
	return blocks;
}

export function stopReasonFor(content: ReplyBlock[]): StopReason {
	return content.some((block) => block.type === 'tool_use') ? 'tool_use' : 'end_turn';
}

function blockText(block: ReplyBlock): string {
	return block.type === 'text' ? block.text : JSON.stringify(block.input);
}

export function outputTokensFor(content: ReplyBlock[]): number {
	return estimateTokens(content.map(blockText).join(''));
}

/** The non-streaming Anthropic Messages response body. */
export function toJsonMessage(message: ScriptedMessage): Record<string, unknown> {
	return {
		id: message.id,
		type: 'message',
		role: 'assistant',
		model: message.model,
		content: message.content,
		stop_reason: stopReasonFor(message.content),
		stop_sequence: null,
		usage: { input_tokens: message.inputTokens, output_tokens: outputTokensFor(message.content) },
	};
}

/** Split into two non-empty halves. A JSON value always has at least two characters. */
export function splitInTwo(json: string): [string, string] {
	const middle = Math.ceil(json.length / 2);
	return [json.slice(0, middle), json.slice(middle)];
}

/** Split text into chunks by code point, so that no chunk breaks a surrogate pair. */
export function chunkText(text: string, size = TEXT_CHUNK_SIZE): string[] {
	const codePoints = Array.from(text);
	const chunks: string[] = [];
	for (let start = 0; start < codePoints.length; start += size) {
		chunks.push(codePoints.slice(start, start + size).join(''));
	}
	return chunks.length > 0 ? chunks : [''];
}

function blockEvents(block: ReplyBlock, index: number): SseEvent[] {
	const start =
		block.type === 'text'
			? { type: 'text', text: '' }
			: { type: 'tool_use', id: block.id, name: block.name, input: {} };
	const deltas =
		block.type === 'text'
			? chunkText(block.text).map((text) => ({ type: 'text_delta', text }))
			: splitInTwo(JSON.stringify(block.input)).map((partial_json) => ({
					type: 'input_json_delta',
					partial_json,
				}));

	return [
		{
			event: 'content_block_start',
			data: { type: 'content_block_start', index, content_block: start },
		},
		...deltas.map((delta) => ({
			event: 'content_block_delta',
			data: { type: 'content_block_delta', index, delta },
		})),
		{ event: 'content_block_stop', data: { type: 'content_block_stop', index } },
	];
}

/** The Anthropic stream events for a message, in the order that the real API sends them. */
export function toSseEvents(message: ScriptedMessage): SseEvent[] {
	const messageStart = {
		id: message.id,
		type: 'message',
		role: 'assistant',
		model: message.model,
		content: [],
		stop_reason: null,
		stop_sequence: null,
		usage: { input_tokens: message.inputTokens, output_tokens: 0 },
	};

	return [
		{ event: 'message_start', data: { type: 'message_start', message: messageStart } },
		...message.content.flatMap(blockEvents),
		{
			event: 'message_delta',
			data: {
				type: 'message_delta',
				delta: { stop_reason: stopReasonFor(message.content), stop_sequence: null },
				usage: { output_tokens: outputTokensFor(message.content) },
			},
		},
		{ event: 'message_stop', data: { type: 'message_stop' } },
	];
}

export function formatSseEvent({ event, data }: SseEvent): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
