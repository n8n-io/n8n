import { describe, expect, test } from 'vitest';

import { describeRequest, recordUse, selectReply } from '../scripted-llm.matcher';
import {
	parseScript,
	type MessagesRequest,
	type RequestMessage,
	type ScriptInput,
} from '../scripted-llm.types';

function tools(...names: string[]) {
	return names.map((name) => ({ name, input_schema: { type: 'object' } }));
}

function request(
	messages: RequestMessage[],
	extra: Partial<MessagesRequest> = {},
): MessagesRequest {
	return { model: 'claude-scripted', messages, ...extra };
}

function userSays(text: string, extra: Partial<MessagesRequest> = {}): MessagesRequest {
	return request([{ role: 'user', content: text }], extra);
}

/** A conversation whose last message answers the tool call `toolu_1` (named `toolName`). */
function afterToolCall(toolName: string, resultContent: unknown = 'ok'): MessagesRequest {
	return request(
		[
			{ role: 'user', content: 'Find the weather' },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Looking it up.' },
					{ type: 'tool_use', id: 'toolu_1', name: toolName, input: {} },
				],
			},
			{
				role: 'user',
				content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: resultContent } as never],
			},
		],
		{ tools: tools(toolName) },
	);
}

function select(script: ScriptInput, req: MessagesRequest, usage = new Map<string, number>()) {
	return selectReply(parseScript(script), req, usage);
}

describe('selectReply', () => {
	test('picks the first matching rule when more than one rule matches', () => {
		const script = {
			rules: [
				{ id: 'first', when: { userText: 'weather' }, reply: { text: 'one' } },
				{ id: 'second', when: { userText: 'weather' }, reply: { text: 'two' } },
			],
		};

		const selected = select(script, userSays('What is the weather?'));

		expect(selected.ruleId).toBe('first');
		expect(selected.text).toBe('one');
	});

	test('matches user text as a case-insensitive regular expression', () => {
		const script = {
			rules: [{ id: 'r', when: { userText: '^build\\s+a' }, reply: { text: 'x' } }],
		};

		expect(select(script, userSays('BUILD a workflow')).ruleId).toBe('r');
		expect(select(script, userSays('Please build a workflow')).ruleId).toBe('fallback');
	});

	test('tests user text against the last text block of the latest message only', () => {
		const script = { rules: [{ id: 'r', when: { userText: 'second' }, reply: { text: 'x' } }] };
		const twoBlocks = request([
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'first block' },
					{ type: 'text', text: 'second block' },
				],
			},
		]);
		const olderMessage = request([
			{ role: 'user', content: 'second' },
			{ role: 'assistant', content: 'ok' },
			{ role: 'user', content: 'third' },
		]);

		expect(select(script, twoBlocks).ruleId).toBe('r');
		expect(select(script, olderMessage).ruleId).toBe('fallback');
	});

	test('gives a latest message that holds only tool results no user text', () => {
		const script = { rules: [{ id: 'r', when: { userText: 'weather' }, reply: { text: 'x' } }] };

		const selected = select(script, afterToolCall('search'));

		expect(selected.ruleId).toBe('fallback');
		expect(selected.context.lastUserText).toBeUndefined();
	});

	const misses = [
		['userText', { userText: 'nomatch' }],
		['afterTool', { afterTool: 'other_tool' }],
		['systemIncludes', { systemIncludes: 'Planner' }],
		['toolAvailable', { toolAvailable: 'missing_tool' }],
	] as const;
	for (const [field, miss] of misses) {
		test(`skips a rule when ${field} does not match even though the other fields match`, () => {
			const matchingWhen = {
				userText: 'weather',
				afterTool: 'search',
				systemIncludes: 'Builder',
				toolAvailable: 'search',
			};
			const req = request(
				[
					{
						role: 'assistant',
						content: [{ type: 'tool_use', id: 't1', name: 'search', input: {} }],
					},
					{
						role: 'user',
						content: [
							{ type: 'tool_result', tool_use_id: 't1', content: 'sunny' } as never,
							{ type: 'text', text: 'And the weather tomorrow?' },
						],
					},
				],
				{ system: 'You are the Builder agent.', tools: tools('search') },
			);
			const script = {
				rules: [
					{ id: 'strict', when: { ...matchingWhen, ...miss }, reply: { text: 'strict' } },
					{ id: 'all', when: matchingWhen, reply: { text: 'all' } },
				],
			};

			expect(select(script, req).ruleId).toBe('all');
		});
	}

	test('matches a rule with an empty `when` for any request', () => {
		const script = { rules: [{ id: 'any', when: {}, reply: { text: 'x' } }] };

		expect(select(script, request([])).ruleId).toBe('any');
	});

	test('reads the system prompt from a string or from text blocks', () => {
		const script = {
			rules: [{ id: 'r', when: { systemIncludes: 'Builder agent' }, reply: { text: 'x' } }],
		};
		const blocks = userSays('hi', {
			system: [
				{ type: 'text', text: 'Shared preamble.' },
				{ type: 'text', text: 'You are the Builder agent.', cache_control: { type: 'ephemeral' } },
			],
		});

		expect(select(script, userSays('hi', { system: 'The Builder agent' })).ruleId).toBe('r');
		expect(select(script, blocks).ruleId).toBe('r');
		expect(select(script, userSays('hi', { system: 'the builder AGENT' })).ruleId).toBe('fallback');
	});

	test('stops using a rule after `times` uses', () => {
		const script = parseScript({
			rules: [
				{ id: 'once', when: { userText: 'hi' }, times: 1, reply: { text: 'first' } },
				{ id: 'later', when: { userText: 'hi' }, reply: { text: 'later' } },
			],
		});
		const usage = new Map<string, number>();

		const first = selectReply(script, userSays('hi'), usage);
		recordUse(usage, first.ruleId);
		const second = selectReply(script, userSays('hi'), usage);

		expect(first.ruleId).toBe('once');
		expect(second.ruleId).toBe('later');
		expect(usage.get('once')).toBe(1);
	});

	test('does not change the usage map', () => {
		const script = parseScript({ rules: [{ id: 'r', when: {}, times: 1, reply: { text: 'x' } }] });
		const usage = new Map<string, number>();

		selectReply(script, userSays('hi'), usage);
		selectReply(script, userSays('hi'), usage);

		expect(usage.size).toBe(0);
	});

	test('does not count uses of the fallback', () => {
		const usage = new Map<string, number>();

		recordUse(usage, 'fallback');
		recordUse(usage, 'rule');
		recordUse(usage, 'rule');

		expect([...usage.entries()]).toEqual([['rule', 2]]);
	});

	test('matches `afterTool` with the name of the tool call that the last tool result answers', () => {
		const script = {
			rules: [
				{ id: 'after-fetch', when: { afterTool: 'fetch' }, reply: { text: 'fetched' } },
				{ id: 'after-search', when: { afterTool: 'search' }, reply: { text: 'searched' } },
			],
		};

		const selected = select(script, afterToolCall('search', [{ type: 'text', text: 'sunny' }]));

		expect(selected.ruleId).toBe('after-search');
		expect(selected.context.lastToolResult).toEqual({
			toolName: 'search',
			text: 'sunny',
			isError: false,
		});
	});

	test('uses the last tool result when one message answers more than one tool call', () => {
		const req = request([
			{
				role: 'assistant',
				content: [
					{ type: 'tool_use', id: 'a', name: 'search', input: {} },
					{ type: 'tool_use', id: 'b', name: 'fetch', input: {} },
				],
			},
			{
				role: 'user',
				content: [
					{ type: 'tool_result', tool_use_id: 'a', content: 'one' } as never,
					{ type: 'tool_result', tool_use_id: 'b', content: 'two', is_error: true } as never,
				],
			},
		]);

		expect(describeRequest(req).lastToolResult).toEqual({
			toolName: 'fetch',
			text: 'two',
			isError: true,
		});
	});

	test('does not match `afterTool` when no assistant message holds the tool call', () => {
		const script = { rules: [{ id: 'r', when: { afterTool: 'search' }, reply: { text: 'x' } }] };
		const req = request([
			{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'gone' } as never] },
		]);

		const selected = select(script, req);

		expect(selected.ruleId).toBe('fallback');
		expect(selected.context.lastToolResult).toEqual({
			toolName: undefined,
			text: '',
			isError: false,
		});
	});

	test('does not match `afterTool` when the latest message is from the assistant', () => {
		const req = afterToolCall('search');
		req.messages.push({ role: 'assistant', content: 'Done.' });

		expect(describeRequest(req).lastToolResult).toBeUndefined();
	});

	test('answers with the default fallback text when no rule matches', () => {
		const selected = select({ rules: [] }, userSays('hi'));

		expect(selected).toMatchObject({
			ruleId: 'fallback',
			text: 'Done.',
			toolCalls: [],
			skippedTools: [],
		});
	});

	test('answers with the script fallback text when the script sets one', () => {
		const selected = select({ rules: [], fallback: { text: 'No script step.' } }, userSays('hi'));

		expect(selected.text).toBe('No script step.');
	});

	test('emits only the tool calls whose tools the request offers', () => {
		const script = {
			rules: [
				{
					id: 'r',
					when: {},
					reply: {
						toolCalls: [
							{ name: 'search', input: { q: 'a' } },
							{ name: 'delete_everything', input: {} },
						],
					},
				},
			],
		};

		const selected = select(script, userSays('hi', { tools: tools('search') }));

		expect(selected.toolCalls).toEqual([{ name: 'search', input: { q: 'a' } }]);
		expect(selected.skippedTools).toEqual(['delete_everything']);
		expect(selected.text).toBeUndefined();
	});

	test('falls back to the rule text when the request offers none of the tools', () => {
		const script = {
			rules: [
				{
					id: 'r',
					when: {},
					reply: { text: 'No tools here.', toolCalls: [{ name: 'search', input: {} }] },
				},
			],
		};

		const selected = select(script, userSays('hi'));

		expect(selected).toMatchObject({
			ruleId: 'r',
			text: 'No tools here.',
			toolCalls: [],
			skippedTools: ['search'],
		});
	});

	test('falls back to the fallback text when a tool-only rule has no offered tool', () => {
		const script = {
			rules: [{ id: 'r', when: {}, reply: { toolCalls: [{ name: 'search', input: {} }] } }],
			fallback: { text: 'Nothing to call.' },
		};

		const selected = select(script, userSays('hi', { tools: tools('fetch') }));

		expect(selected).toMatchObject({
			ruleId: 'r',
			text: 'Nothing to call.',
			skippedTools: ['search'],
		});
	});
});

describe('parseScript', () => {
	test('accepts a minimal script', () => {
		expect(parseScript({ rules: [] })).toEqual({ rules: [] });
	});

	const invalidScripts: Array<[string, unknown]> = [
		[
			'an invalid regular expression',
			{ rules: [{ id: 'r', when: { userText: '(' }, reply: { text: 'x' } }] },
		],
		[
			'duplicate rule ids',
			{
				rules: [
					{ id: 'r', when: {}, reply: { text: 'x' } },
					{ id: 'r', when: {}, reply: { text: 'y' } },
				],
			},
		],
		['the reserved id "fallback"', { rules: [{ id: 'fallback', when: {}, reply: { text: 'x' } }] }],
		[
			'a reply without text or tool calls',
			{ rules: [{ id: 'r', when: {}, reply: { toolCalls: [] } }] },
		],
		[
			'an unknown `when` field',
			{ rules: [{ id: 'r', when: { userTxt: 'x' }, reply: { text: 'x' } }] },
		],
		['a zero `times`', { rules: [{ id: 'r', when: {}, times: 0, reply: { text: 'x' } }] }],
		['a missing rules list', { fallback: { text: 'x' } }],
	];
	for (const [name, script] of invalidScripts) {
		test(`rejects ${name}`, () => {
			expect(() => parseScript(script)).toThrow(/Invalid scripted LLM script/);
		});
	}

	test('names the path of each problem', () => {
		const script = {
			rules: [
				{ id: 'a', when: {}, reply: { text: 'x' } },
				{ id: 'a', when: { systemIncludes: '[' }, reply: { text: 'x' } },
			],
		};

		expect(() => parseScript(script)).toThrow(
			/rules\.1\.when\.systemIncludes: .*rules\.1\.id: Duplicate/,
		);
	});
});

// fast-check does not resolve from this package, so this property test uses a seeded generator.
describe('selectReply property: the selected rule is the first eligible rule', () => {
	const WORDS = ['alpha', 'beta', 'gamma', 'delta'];
	const TOOLS = ['search', 'fetch', 'save'];

	function createRandom(seed: number) {
		let state = seed >>> 0;
		const next = () => {
			state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
			return state / 2 ** 32;
		};
		const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
		const maybe = <T>(make: () => T): T | undefined => (next() < 0.5 ? make() : undefined);
		return { next, pick, maybe };
	}

	type Facts = { userText?: string; system: string; tools: string[]; afterTool?: string };

	function generateCase(random: ReturnType<typeof createRandom>) {
		const facts: Facts = {
			userText: random.maybe(() => `${random.pick(WORDS)} ${random.pick(WORDS)}`.toUpperCase()),
			system: `${random.pick(WORDS)} agent`,
			tools: TOOLS.filter(() => random.next() < 0.5),
			afterTool: random.maybe(() => random.pick(TOOLS)),
		};
		const rules = Array.from({ length: 1 + Math.floor(random.next() * 6) }, (_, index) => ({
			id: `rule-${index}`,
			when: {
				userText: random.maybe(() => random.pick(WORDS)),
				afterTool: random.maybe(() => random.pick(TOOLS)),
				systemIncludes: random.maybe(() => random.pick(WORDS)),
				toolAvailable: random.maybe(() => random.pick(TOOLS)),
			},
			times: random.maybe(() => 1 + Math.floor(random.next() * 2)),
			reply: { text: `reply-${index}` },
		}));
		const usage = new Map(rules.map((rule) => [rule.id, Math.floor(random.next() * 3)]));
		return { facts, rules, usage };
	}

	function buildRequest(facts: Facts): MessagesRequest {
		const messages: RequestMessage[] = [];
		const latest: Array<Record<string, unknown>> = [];
		if (facts.afterTool) {
			messages.push({
				role: 'assistant',
				content: [{ type: 'tool_use', id: 'toolu_x', name: facts.afterTool, input: {} }],
			});
			latest.push({ type: 'tool_result', tool_use_id: 'toolu_x', content: 'ok' });
		}
		if (facts.userText) latest.push({ type: 'text', text: facts.userText });
		messages.push({ role: 'user', content: latest as never });
		return request(messages, { system: facts.system, tools: tools(...facts.tools) });
	}

	/** Naive reference: plain substring checks on the generated facts, not on the request. */
	function referenceRuleId(
		facts: Facts,
		rules: ReturnType<typeof generateCase>['rules'],
		usage: Map<string, number>,
	) {
		for (const rule of rules) {
			const { when } = rule;
			const eligible =
				(rule.times === undefined || (usage.get(rule.id) ?? 0) < rule.times) &&
				(when.userText === undefined ||
					(facts.userText ?? '').toLowerCase().includes(when.userText.toLowerCase())) &&
				(when.afterTool === undefined || facts.afterTool === when.afterTool) &&
				(when.systemIncludes === undefined || facts.system.includes(when.systemIncludes)) &&
				(when.toolAvailable === undefined || facts.tools.includes(when.toolAvailable));
			if (eligible) return rule.id;
		}
		return 'fallback';
	}

	test('holds for 1000 generated scripts and requests', () => {
		const random = createRandom(20261007);
		let matched = 0;

		for (let run = 0; run < 1000; run++) {
			const { facts, rules, usage } = generateCase(random);
			const expected = referenceRuleId(facts, rules, usage);

			const selected = selectReply(parseScript({ rules }), buildRequest(facts), usage);

			expect(selected.ruleId, `run ${run}`).toBe(expected);
			matched += Number(expected !== 'fallback');
		}

		// Both outcomes must occur, or the generator does not test the property.
		expect(matched).toBeGreaterThan(100);
		expect(matched).toBeLessThan(900);
	});
});
