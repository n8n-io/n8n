import { describe, expect, test } from 'vitest';

import {
	chunkText,
	formatSseEvent,
	splitInTwo,
	toJsonMessage,
	toReplyBlocks,
	toSseEvents,
	type ScriptedMessage,
	type SseEvent,
} from '../scripted-llm.sse';

function message(
	text: string | undefined,
	toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [],
): ScriptedMessage {
	let counter = 0;
	return {
		id: 'msg_1',
		model: 'claude-scripted',
		content: toReplyBlocks(text, toolCalls, () => `toolu_scripted_${++counter}`),
		inputTokens: 42,
	};
}

/** Event names, with the delta type after each content_block_delta. */
function sequence(events: SseEvent[]): string[] {
	return events.map(({ event, data }) => {
		const delta = data.delta;
		if (event !== 'content_block_delta' || typeof delta !== 'object' || delta === null)
			return event;
		return `${event}:${String((delta as { type: string }).type)}`;
	});
}

function deltasFor(events: SseEvent[], index: number): Array<Record<string, string>> {
	return events
		.filter(({ data }) => data.type === 'content_block_delta' && data.index === index)
		.map(({ data }) => data.delta as Record<string, string>);
}

function stopReason(events: SseEvent[]): unknown {
	const messageDelta = events.find(({ event }) => event === 'message_delta');
	return (messageDelta!.data.delta as { stop_reason: unknown }).stop_reason;
}

describe('toSseEvents', () => {
	test('streams a text-only reply and ends the turn', () => {
		const events = toSseEvents(message('Hello there.'));

		expect(sequence(events)).toEqual([
			'message_start',
			'content_block_start',
			'content_block_delta:text_delta',
			'content_block_stop',
			'message_delta',
			'message_stop',
		]);
		expect(events[1].data).toEqual({
			type: 'content_block_start',
			index: 0,
			content_block: { type: 'text', text: '' },
		});
		expect(
			deltasFor(events, 0)
				.map((delta) => delta.text)
				.join(''),
		).toBe('Hello there.');
		expect(stopReason(events)).toBe('end_turn');
	});

	test('streams a tool-call-only reply as two JSON chunks and stops for tool use', () => {
		const input = { query: 'weather in Berlin', options: { days: 3, units: ['c'] } };
		const events = toSseEvents(message(undefined, [{ name: 'search', input }]));

		expect(sequence(events)).toEqual([
			'message_start',
			'content_block_start',
			'content_block_delta:input_json_delta',
			'content_block_delta:input_json_delta',
			'content_block_stop',
			'message_delta',
			'message_stop',
		]);
		expect(events[1].data.content_block).toEqual({
			type: 'tool_use',
			id: 'toolu_scripted_1',
			name: 'search',
			input: {},
		});
		const json = deltasFor(events, 0)
			.map((delta) => delta.partial_json)
			.join('');
		expect(JSON.parse(json)).toEqual(input);
		expect(stopReason(events)).toBe('tool_use');
	});

	test('streams text and two tool calls as three indexed blocks', () => {
		const first = { id: 1 };
		const second = { text: 'ünïcödé 🚀', list: [1, 2, 3] };
		const events = toSseEvents(
			message('Two calls.', [
				{ name: 'fetch', input: first },
				{ name: 'save', input: second },
			]),
		);

		expect(sequence(events)).toEqual([
			'message_start',
			'content_block_start',
			'content_block_delta:text_delta',
			'content_block_stop',
			'content_block_start',
			'content_block_delta:input_json_delta',
			'content_block_delta:input_json_delta',
			'content_block_stop',
			'content_block_start',
			'content_block_delta:input_json_delta',
			'content_block_delta:input_json_delta',
			'content_block_stop',
			'message_delta',
			'message_stop',
		]);
		const starts = events.filter(({ event }) => event === 'content_block_start');
		expect(starts.map(({ data }) => data.index)).toEqual([0, 1, 2]);
		expect(starts.map(({ data }) => (data.content_block as { id?: string }).id)).toEqual([
			undefined,
			'toolu_scripted_1',
			'toolu_scripted_2',
		]);
		expect(
			JSON.parse(
				deltasFor(events, 1)
					.map((d) => d.partial_json)
					.join(''),
			),
		).toEqual(first);
		expect(
			JSON.parse(
				deltasFor(events, 2)
					.map((d) => d.partial_json)
					.join(''),
			),
		).toEqual(second);
		expect(stopReason(events)).toBe('tool_use');
	});

	test('starts with an empty assistant message and reports usage at the end', () => {
		const events = toSseEvents(message('abcdefgh'));

		expect(events[0].data.message).toEqual({
			id: 'msg_1',
			type: 'message',
			role: 'assistant',
			model: 'claude-scripted',
			content: [],
			stop_reason: null,
			stop_sequence: null,
			usage: { input_tokens: 42, output_tokens: 0 },
		});
		expect(events.at(-2)?.data).toEqual({
			type: 'message_delta',
			delta: { stop_reason: 'end_turn', stop_sequence: null },
			usage: { output_tokens: 2 },
		});
		expect(events.at(-1)?.data).toEqual({ type: 'message_stop' });
	});

	test('sends long text in more than one delta without loss', () => {
		const text = `${'word '.repeat(40)}🚀 end`;
		const events = toSseEvents(message(text));

		const deltas = deltasFor(events, 0);
		expect(deltas.length).toBeGreaterThan(1);
		expect(deltas.map((delta) => delta.text).join('')).toBe(text);
	});
});

describe('toJsonMessage', () => {
	test('builds the non-streaming body for a tool call', () => {
		const body = toJsonMessage(message('Calling.', [{ name: 'search', input: { q: 'x' } }]));

		expect(body).toEqual({
			id: 'msg_1',
			type: 'message',
			role: 'assistant',
			model: 'claude-scripted',
			content: [
				{ type: 'text', text: 'Calling.' },
				{ type: 'tool_use', id: 'toolu_scripted_1', name: 'search', input: { q: 'x' } },
			],
			stop_reason: 'tool_use',
			stop_sequence: null,
			usage: { input_tokens: 42, output_tokens: expect.any(Number) },
		});
	});

	test('ends the turn for a text reply', () => {
		expect(toJsonMessage(message('Hi')).stop_reason).toBe('end_turn');
	});
});

describe('helpers', () => {
	test('formats one SSE event as an event line, a data line and a blank line', () => {
		expect(formatSseEvent({ event: 'message_stop', data: { type: 'message_stop' } })).toBe(
			'event: message_stop\ndata: {"type":"message_stop"}\n\n',
		);
	});

	for (const json of [
		'{}',
		'[]',
		'{"a":1}',
		JSON.stringify({ deep: { list: [1, 'two', null] } }),
	]) {
		test(`splits ${json} into two non-empty chunks that join back`, () => {
			const [head, tail] = splitInTwo(json);

			expect(head.length).toBeGreaterThan(0);
			expect(tail.length).toBeGreaterThan(0);
			expect(head + tail).toBe(json);
		});
	}

	test('does not split a surrogate pair across text chunks', () => {
		const chunks = chunkText('a🚀b🚀', 2);

		expect(chunks).toEqual(['a🚀', 'b🚀']);
	});
});
