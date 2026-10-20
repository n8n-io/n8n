// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { ExpressionError } from '../src/errors/expression.error';
import type { IExecuteData, INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

const ENGINE = (process.env.N8N_EXPRESSION_ENGINE ?? 'vm') as 'legacy' | 'vm' | 'quickjs';

class Widget {
	constructor(public label: string) {}

	describe() {
		return this.label;
	}
}

const circular = () => {
	const o: Record<string, unknown> = { a: 1 };
	o.self = o;
	return o;
};

const throwingGetter = () => {
	const o = {};
	Object.defineProperty(o, 'boom', {
		enumerable: true,
		get() {
			throw new Error('getter exploded');
		},
	});
	return o;
};

const siblingReadingGetter = () => {
	const o: Record<string, unknown> = {
		safe: 'x',
		get a() {
			return String(this.safe).toUpperCase();
		},
	};
	o.c = circular();
	return o;
};

const guardedGetter = () => {
	const o: Record<string, unknown> = { enabled: true };
	Object.defineProperty(o, 'bad', {
		enumerable: true,
		get() {
			if (this.enabled) throw new Error('guard tripped');
			return 1;
		},
	});
	o.other = 2;
	return o;
};

const deepChain = (depth: number) => {
	let node: Record<string, unknown> = { fn: () => 1 };
	for (let level = depth; level > 0; level--) node = { next: node, tag: level };
	return node;
};

type Case = {
	name: string;
	extra: () => Record<string, unknown>;
	rejectedAt: Partial<Record<'vm' | 'quickjs', string>>;
};

const CASES: Case[] = [
	{ name: 'a function', extra: () => ({ fn: () => 1 }), rejectedAt: { vm: 'json.fn' } },
	{ name: 'a proxy', extra: () => ({ px: new Proxy({ a: 1 }, {}) }), rejectedAt: {} },
	{
		name: 'an enumerable getter that throws',
		extra: () => ({ g: throwingGetter() }),
		rejectedAt: { vm: 'json.g.boom', quickjs: 'json.g.boom' },
	},
	{
		name: 'a circular reference',
		extra: () => ({ circ: circular() }),
		rejectedAt: { quickjs: 'json.circ.self' },
	},
	{ name: 'a class instance', extra: () => ({ inst: new Widget('w') }), rejectedAt: {} },
	{
		name: 'a symbol-keyed value',
		extra: () => ({ sym: { [Symbol('s')]: 1, ok: 2 } }),
		rejectedAt: {},
	},
	{ name: 'a Date', extra: () => ({ when: new Date(0) }), rejectedAt: {} },
	{ name: 'a Buffer', extra: () => ({ buf: Buffer.from('hello') }), rejectedAt: {} },
	{ name: 'a Map', extra: () => ({ m: new Map([['a', 1]]) }), rejectedAt: {} },
	{ name: 'a 4MB string', extra: () => ({ blob: 'x'.repeat(4 * 1024 * 1024) }), rejectedAt: {} },
	{
		name: 'a Map holding a function',
		extra: () => ({ mfn: new Map<string, unknown>([['a', () => 1]]) }),
		rejectedAt: { vm: 'json.mfn' },
	},
	{
		name: 'a Set holding a function',
		extra: () => ({ sfn: new Set<unknown>([() => 1]) }),
		rejectedAt: { vm: 'json.sfn' },
	},
	{ name: 'a symbol value', extra: () => ({ symv: Symbol('s') }), rejectedAt: { vm: 'json.symv' } },
	{
		name: 'a promise',
		extra: () => ({ pr: Promise.resolve(1) }),
		rejectedAt: { vm: 'json.pr' },
	},
	{ name: 'a WeakMap', extra: () => ({ wm: new WeakMap() }), rejectedAt: { vm: 'json.wm' } },
	{ name: 'a bigint', extra: () => ({ big: 1n }), rejectedAt: {} },
	{
		name: 'a function under a key holding a dot',
		extra: () => ({ 'a.b': () => 1 }),
		rejectedAt: { vm: "json['a.b']" },
	},
	{
		name: 'a throwing toJSON',
		extra: () => ({
			tj: {
				toJSON() {
					throw new Error('toJSON exploded');
				},
			},
		}),
		rejectedAt: { vm: 'json.tj.toJSON', quickjs: 'json.tj.toJSON' },
	},
	{
		name: 'a function beside a circular reference',
		extra: () => ({ fn2: () => 1, circ2: circular() }),
		rejectedAt: { vm: 'json.fn2', quickjs: 'json.circ2.self' },
	},
	{
		name: 'a getter that reads a sibling, beside a circular reference',
		extra: () => ({ gt: siblingReadingGetter() }),
		rejectedAt: { vm: 'json.gt.a', quickjs: 'json.gt.c.self' },
	},
	{
		name: 'a getter that throws only when its sibling is set',
		extra: () => ({ gd: guardedGetter() }),
		rejectedAt: { vm: 'json.gd.bad', quickjs: 'json.gd.bad' },
	},
];

const EAGER_ACCESSORS: Array<[string, string]> = [
	['$().item', "={{ $('Upstream').item.json.plain_key }}"],
	['$().first()', "={{ $('Upstream').first().json.plain_key }}"],
	['$().last()', "={{ $('Upstream').last().json.plain_key }}"],
	['$().all()[0]', "={{ $('Upstream').all()[0].json.plain_key }}"],
	['$().itemMatching(0)', "={{ $('Upstream').itemMatching(0).json.plain_key }}"],
	['$input.first()', '={{ $input.first().json.plain_key }}'],
	['$items()', '={{ $items("Upstream")[0].json.plain_key }}'],
];

const readOf = (expr: string, path: string | undefined) =>
	path === undefined ? expr : expr.replace('json.plain_key', path);

const makeWorld = (extra: Record<string, unknown>) => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Upstream',
				typeVersion: 1,
				type: 'test.set',
				id: 'up-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'cur-1',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: { Upstream: { main: [[{ node: 'Current', type: 'main', index: 0 }]] } },
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});

	const item: INodeExecutionData = {
		pairedItem: { item: 0 },
		json: { plain_key: 'the-value', ...extra } as INodeExecutionData['json'],
	};

	const runExecutionData = createRunExecutionData({
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		resultData: {
			runData: {
				Upstream: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: { main: [[item]] },
					},
				],
			},
		},
	});

	const items = [item];
	const executeData: IExecuteData = {
		data: { main: [items] },
		node: workflow.getNode('Current')!,
		source: { main: [{ previousNode: 'Upstream', previousNodeOutput: 0, previousNodeRun: 0 }] },
	};

	const evaluate = (expr: string) =>
		workflow.expression.getParameterValue(
			expr,
			runExecutionData,
			0,
			0,
			'Current',
			items,
			'manual',
			{},
			executeData,
		);

	return { workflow, evaluate };
};

describe('an upstream item holding a value the engine cannot transfer', () => {
	describe.each(CASES)('$name', ({ extra, rejectedAt }) => {
		const path = ENGINE === 'legacy' ? undefined : rejectedAt[ENGINE];
		let world: ReturnType<typeof makeWorld>;

		beforeAll(async () => {
			world = makeWorld(extra());
			await world.workflow.expression.acquireIsolate();
		});
		afterAll(async () => {
			await world.workflow.expression.releaseIsolate();
		});

		it('reads a sibling key through $json', () => {
			expect(world.evaluate('={{ $json.plain_key }}')).toBe('the-value');
		});

		it.each(EAGER_ACCESSORS)('reads a sibling key through %s', (_accessor, expr) => {
			expect(world.evaluate(expr)).toBe('the-value');
		});

		it.each(EAGER_ACCESSORS)('raises on a read of the value itself through %s', (_a, expr) => {
			if (path === undefined) {
				expect(() => world.evaluate(readOf(expr, path))).not.toThrow();
				return;
			}

			let caught: unknown;
			try {
				world.evaluate(readOf(expr, path));
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(ExpressionError);
			expect((caught as ExpressionError).message).toContain("'Upstream'");
			expect((caught as ExpressionError).message).toContain(path);
		});
	});
});

describe.skipIf(ENGINE === 'legacy')(
	'an item member the engine refuses to copy as it stands',
	() => {
		let world: ReturnType<typeof makeWorld>;

		beforeAll(async () => {
			world = makeWorld({ px: new Proxy({ a: 1 }, {}), fn: () => 1 });
			await world.workflow.expression.acquireIsolate();
		});
		afterAll(async () => {
			await world.workflow.expression.releaseIsolate();
		});

		it('crosses as its own data', () => {
			expect(world.evaluate("={{ $('Upstream').item.json.px.a }}")).toBe(1);
		});
	},
);

describe.skipIf(ENGINE !== 'vm')('the message a rejected value produces', () => {
	let world: ReturnType<typeof makeWorld>;

	beforeAll(async () => {
		world = makeWorld({ fn: () => 1 });
		await world.workflow.expression.acquireIsolate();
	});
	afterAll(async () => {
		await world.workflow.expression.releaseIsolate();
	});

	it('names the node, the key path and what the value is', () => {
		let caught: unknown;
		try {
			world.evaluate("={{ $('Upstream').item.json.fn }}");
		} catch (error) {
			caught = error;
		}

		expect((caught as ExpressionError).message).toBe(
			"Can't read item from node 'Upstream': the value at json.fn cannot be used in an expression (a function)",
		);
	});
});

describe.skipIf(ENGINE !== 'vm')('an item nested deeper than the depth cap', () => {
	let world: ReturnType<typeof makeWorld>;

	beforeAll(async () => {
		world = makeWorld({ deep: deepChain(200) });
		await world.workflow.expression.acquireIsolate();
	});
	afterAll(async () => {
		await world.workflow.expression.releaseIsolate();
	});

	it('reads a sibling key of the nested value', () => {
		expect(world.evaluate("={{ $('Upstream').item.json.plain_key }}")).toBe('the-value');
	});

	it('reads a level above the cap', () => {
		const path = `json.deep${'.next'.repeat(20)}.tag`;
		expect(world.evaluate(`={{ $('Upstream').item.${path} }}`)).toBe(21);
	});

	it('raises on a read below the cap', () => {
		const path = `json.deep${'.next'.repeat(190)}.tag`;

		let caught: unknown;
		try {
			world.evaluate(`={{ $('Upstream').item.${path} }}`);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		expect((caught as ExpressionError).message).toContain('stopped early');
	});
});
