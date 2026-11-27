import {
	ExpressionEvaluator,
	IsolatedVmBridge,
	QuickJsBridge,
	type WorkflowData,
} from '@n8n/expression-runtime';
import { expressionSandboxHooks } from 'n8n-workflow/expression-sandboxing';
import { afterAll } from 'vitest';

import { defineBench } from '../bench-options';

const numbers = Array.from({ length: 20_000 }, (_, i) => i);
const strings = Array.from({ length: 2000 }, (_, i) => `value-${i}`);
const shared = { id: 1, name: 'shared' };
const items = Array.from({ length: 2000 }, () => ({ json: shared }));
const datedItems = Array.from({ length: 2000 }, (_, i) => ({
	json: { id: i, when: new Date(1_700_000_000_000 + i * 1000) },
}));
const mappedItems = Array.from({ length: 500 }, (_, i) => ({
	json: { id: i, fields: new Map<string, unknown>([['key', { value: i }]]) },
}));

const cases: Array<{ name: string; expression: string; data: WorkflowData }> = [
	{
		name: 'return 50000 numbers',
		expression: '{{ Array.from({ length: 50000 }, (_, i) => i) }}',
		data: {},
	},
	{
		name: 'return 5000 small arrays',
		expression: '{{ Array.from({ length: 5000 }, (_, i) => [i, i + 1]) }}',
		data: {},
	},
	{
		name: 'return item with 20000 numbers',
		expression: '{{ $input.first().json }}',
		data: { $input: { first: () => ({ json: { numbers } }) } },
	},
	{
		name: 'return item with 2000 strings',
		expression: '{{ $input.first().json }}',
		data: { $input: { first: () => ({ json: { strings } }) } },
	},
	{
		name: 'count items with shared data',
		expression: '{{ $items().length }}',
		data: { $items: () => items },
	},
	{
		name: 'count items with dates',
		expression: '{{ $items().length }}',
		data: { $items: () => datedItems },
	},
	{
		name: 'count items with maps',
		expression: '{{ $items().length }}',
		data: { $items: () => mappedItems },
	},
	{
		name: 'return 500 errors',
		expression:
			'{{ Array.from({ length: 500 }, (_, i) => Object.assign(new Error("e" + i), { code: i, info: { list: [1, 2] } })) }}',
		data: {},
	},
	{
		name: 'return 2000 class instances',
		expression:
			'{{ (() => { function Row() {} return Array.from({ length: 2000 }, (_, i) => Object.assign(new Row(), { id: i, name: "row" + i })); })() }}',
		data: {},
	},
	{
		name: 'return map with 5000 shared values',
		expression:
			'{{ (() => { const value = { id: 1, tags: ["a"] }; return new Map(Array.from({ length: 5000 }, (_, i) => ["k" + i, value])); })() }}',
		data: {},
	},
	{
		name: 'return 1000 rows with Date, Map, Set and Error',
		expression:
			'{{ Array.from({ length: 1000 }, (_, i) => ({ id: i, when: new Date(i), tags: new Set([i]), meta: new Map([["k", i]]), error: new Error("e" + i) })) }}',
		data: {},
	},
	{
		name: 'return 200 objects 40 levels deep',
		expression:
			'{{ Array.from({ length: 200 }, (_, k) => { let o = { v: k }; for (let i = 0; i < 40; i++) { o = { next: o }; } return o; }) }}',
		data: {},
	},
];

/** The CodSpeed instrumentation makes each evaluation much slower than a normal run. */
const BRIDGE_TIMEOUT_MS = 60_000;

for (const engine of ['vm', 'quickjs']) {
	const evaluator = new ExpressionEvaluator({
		createBridge: () =>
			engine === 'vm'
				? new IsolatedVmBridge({ timeout: BRIDGE_TIMEOUT_MS })
				: new QuickJsBridge({ timeout: BRIDGE_TIMEOUT_MS }),
		poolSize: 1,
		maxCodeCacheSize: 1024,
		hooks: expressionSandboxHooks,
	});
	const caller = {};
	await evaluator.initialize();
	await evaluator.acquire(caller);

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	for (const { name, expression, data } of cases) {
		defineBench(`${engine} transfer: ${name}`, () => {
			evaluator.evaluate(expression, data, caller);
		});
	}
}
