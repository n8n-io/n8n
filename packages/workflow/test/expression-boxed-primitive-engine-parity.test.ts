// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';

// Boxed primitives (String, Number, Boolean, BigInt) must return the same
// wrapper instances across legacy, vm, quickjs, and native evaluation, whether
// created in the expression or read from item data.

describe('Expression - boxed primitives (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: ['Source', 'Current'].map((name) => ({
			name,
			typeVersion: 1,
			type: 'test.set',
			id: name,
			position: [0, 0],
			parameters: {},
		})),
		connections: {
			Source: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const circular = Object('ab') as object & { self?: unknown };
	circular.self = circular;

	let getterReads = 0;
	const withGetter = Object('ab') as object;
	Object.defineProperty(withGetter, 'ok', { value: 1, enumerable: true });
	Object.defineProperty(withGetter, 'lazy', {
		get() {
			getterReads++;
			return 'computed';
		},
		enumerable: true,
	});
	Object.defineProperty(withGetter, 'failing', {
		get() {
			throw new Error('getter boom');
		},
		enumerable: true,
	});

	const withErrorField = Object.assign(Object('ab') as object, {
		ok: 2,
		err: new Error('field boom'),
	});

	const withHidden = Object.defineProperty(Object(5) as object, 'meta', { value: 1 });
	const withHiddenAndEnum = Object.defineProperty(
		Object.assign(Object('ab') as object, { unit: 'kg' }),
		'secret',
		{ value: 9 },
	);

	const item = {
		json: {
			s: Object('ab') as object,
			n: Object(5) as object,
			nz: Object(-0) as object,
			nan: Object(NaN) as object,
			inf: Object(Infinity) as object,
			b: Object(true) as object,
			bf: Object(false) as object,
			bi: Object(1n) as object,
			arr: [Object('ab') as object, Object(5) as object, Object(true) as object],
			tagged: Object.assign(Object('ab') as object, { meta: 1, info: { deep: 'x' } }),
			taggedNumber: Object.assign(Object(5) as object, { unit: 'kg' }),
			circular,
			withGetter,
			withErrorField,
			withHidden,
			withHiddenAndEnum,
			err: Object.assign(new Error('boom'), {
				s: Object('ab') as object,
				n: Object(5) as object,
				b: Object(false) as object,
			}),
		},
		pairedItem: { item: 0 },
	};

	const valueOf = (value: unknown): unknown => (value as { valueOf(): unknown }).valueOf();

	const evaluate = (expr: string, native: boolean, returnObjectAsString = false): unknown => {
		const items = [item] as never[];
		Expression.setNativeEvaluation(native);
		try {
			return expression.getParameterValue(
				expr,
				createRunExecutionData({
					resultData: {
						runData: {
							Source: [
								{
									startTime: 0,
									executionTime: 0,
									executionIndex: 0,
									source: [],
									data: { main: [items] },
								},
							],
						},
					},
				}),
				0,
				0,
				'Current',
				items,
				'manual',
				{},
				{
					node: workflow.getNode('Current')!,
					data: { main: [items] },
					source: { main: [{ previousNode: 'Source' }] },
				},
				returnObjectAsString,
			);
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	describe.each([false, true])('native evaluation: %s', (native) => {
		describe('returned from expressions', () => {
			it.each([
				['={{ new String("ab") }}', String, 'ab'],
				['={{ new String("") }}', String, ''],
				['={{ new Number(5) }}', Number, 5],
				['={{ new Number(0) }}', Number, 0],
				['={{ new Number(-0) }}', Number, -0],
				['={{ new Number(NaN) }}', Number, NaN],
				['={{ new Number(Infinity) }}', Number, Infinity],
				['={{ new Number(-Infinity) }}', Number, -Infinity],
				['={{ new Boolean(true) }}', Boolean, true],
				['={{ new Boolean(false) }}', Boolean, false],
				['={{ Object(1n) }}', BigInt, 1n],
			] as const)('%s', (expr, ctor, expected) => {
				const result = evaluate(expr, native);

				expect(result).toBeInstanceOf(ctor);
				expect(Object.is(valueOf(result), expected)).toBe(true);
			});

			it('keeps nested boxed primitives in objects and arrays', () => {
				const obj = evaluate(
					'={{ ({ s: new String("ab"), n: new Number(5), b: new Boolean(true) }) }}',
					native,
				) as Record<string, { valueOf(): unknown }>;

				expect(obj.s).toBeInstanceOf(String);
				expect(obj.s.valueOf()).toBe('ab');
				expect(obj.n).toBeInstanceOf(Number);
				expect(obj.n.valueOf()).toBe(5);
				expect(obj.b).toBeInstanceOf(Boolean);
				expect(obj.b.valueOf()).toBe(true);

				const list = evaluate(
					'={{ [new String("ab"), new Number(5), new Boolean(true)] }}',
					native,
				) as Array<{ valueOf(): unknown }>;

				expect(list[0]).toBeInstanceOf(String);
				expect(list[0].valueOf()).toBe('ab');
				expect(list[1]).toBeInstanceOf(Number);
				expect(list[1].valueOf()).toBe(5);
				expect(list[2]).toBeInstanceOf(Boolean);
				expect(list[2].valueOf()).toBe(true);
			});

			it.each([
				['={{ new String("ab") }}', '[String: "ab"]'],
				['={{ new Number(5) }}', '[Number: 5]'],
				['={{ new Boolean(true) }}', '[Boolean: true]'],
				['={{ $json.s }}', '[String: "ab"]'],
				['={{ $json.n }}', '[Number: 5]'],
				['={{ $json.b }}', '[Boolean: true]'],
			])('formats %s as %s when returnObjectAsString is true', (expr, expected) => {
				expect(evaluate(expr, native, true)).toBe(expected);
			});

			it.each([
				['=hello {{ new String("ab") }}', 'hello ab'],
				['=hello {{ new Number(5) }}', 'hello 5'],
				['=hello {{ new Boolean(true) }}', 'hello true'],
				['=hello {{ $json.s }}', 'hello ab'],
				['=hello {{ $json.n }}', 'hello 5'],
				['=hello {{ $json.b }}', 'hello true'],
				["=hello {{ $('Source').item.json.s }}", 'hello ab'],
				["=hello {{ $('Source').item.json.n }}", 'hello 5'],
				["=hello {{ $('Source').item.json.b }}", 'hello true'],
			])('interpolates %s', (expr, expected) => {
				expect(evaluate(expr, native)).toBe(expected);
			});
		});

		describe('read from item data', () => {
			it.each([
				'$json',
				"$('Source').item.json",
				"$('Source').first().json",
				'$input.first().json',
			])('preserves wrapper identity through %s', (root) => {
				const s = evaluate(`={{ ${root}.s }}`, native);
				expect(s).toBeInstanceOf(String);
				expect(valueOf(s)).toBe('ab');

				const n = evaluate(`={{ ${root}.n }}`, native);
				expect(n).toBeInstanceOf(Number);
				expect(valueOf(n)).toBe(5);

				const nz = evaluate(`={{ ${root}.nz }}`, native);
				expect(nz).toBeInstanceOf(Number);
				expect(Object.is(valueOf(nz), -0)).toBe(true);

				const nan = evaluate(`={{ ${root}.nan }}`, native);
				expect(nan).toBeInstanceOf(Number);
				expect(Number.isNaN(valueOf(nan))).toBe(true);

				const inf = evaluate(`={{ ${root}.inf }}`, native);
				expect(inf).toBeInstanceOf(Number);
				expect(valueOf(inf)).toBe(Infinity);

				const b = evaluate(`={{ ${root}.b }}`, native);
				expect(b).toBeInstanceOf(Boolean);
				expect(valueOf(b)).toBe(true);

				const bf = evaluate(`={{ ${root}.bf }}`, native);
				expect(bf).toBeInstanceOf(Boolean);
				expect(valueOf(bf)).toBe(false);

				const bi = evaluate(`={{ ${root}.bi }}`, native);
				expect(bi).toBeInstanceOf(BigInt);
				expect(valueOf(bi)).toBe(1n);

				const errStr = evaluate(`={{ ${root}.err.s }}`, native);
				expect(errStr).toBeInstanceOf(String);
				expect(valueOf(errStr)).toBe('ab');
			});

			it.each(['$json', '$input.item.json'])(
				'keeps the value, the type and the own fields of a wrapper through %s',
				(root) => {
					expect(evaluate(`={{ ${root}.tagged.meta }}`, native)).toBe(1);
					expect(evaluate(`={{ ${root}.tagged.info.deep }}`, native)).toBe('x');
					expect(evaluate(`={{ Object.keys(${root}.tagged) }}`, native)).toEqual([
						'0',
						'1',
						'meta',
						'info',
					]);
					expect(evaluate(`={{ ${root}.tagged + "!" }}`, native)).toBe('ab!');
					expect(evaluate(`={{ ${root}.tagged instanceof String }}`, native)).toBe(true);
					expect(evaluate(`={{ ${root}.taggedNumber.unit }}`, native)).toBe('kg');
					expect(evaluate(`={{ Object.keys(${root}.taggedNumber) }}`, native)).toEqual(['unit']);
					expect(evaluate(`={{ ${root}.taggedNumber + 1 }}`, native)).toBe(6);
					expect(evaluate(`={{ ${root}.taggedNumber instanceof Number }}`, native)).toBe(true);
				},
			);

			it.each(['$json', '$input.item.json'])(
				'reads circular, getter-backed, and error-bearing own fields lazily through %s',
				(root) => {
					expect(evaluate(`={{ ${root}.circular + "!" }}`, native)).toBe('ab!');
					expect(evaluate(`={{ ${root}.circular.self + "!" }}`, native)).toBe('ab!');
					expect(evaluate(`={{ ${root}.circular.self instanceof String }}`, native)).toBe(true);

					getterReads = 0;
					expect(evaluate(`={{ ${root}.withGetter + "!" }}`, native)).toBe('ab!');
					expect(evaluate(`={{ ${root}.withGetter.ok }}`, native)).toBe(1);
					expect(evaluate(`={{ Object.keys(${root}.withGetter) }}`, native)).toEqual([
						'0',
						'1',
						'ok',
						'lazy',
						'failing',
					]);
					expect(getterReads).toBe(0);
					expect(evaluate(`={{ ${root}.withGetter.lazy }}`, native)).toBe('computed');
					expect(getterReads).toBe(1);

					expect(evaluate(`={{ ${root}.withErrorField.ok }}`, native)).toBe(2);
					expect(evaluate(`={{ ${root}.withErrorField.err instanceof Error }}`, native)).toBe(true);
					expect(evaluate(`={{ ${root}.withErrorField.err.message }}`, native)).toBe('field boom');

					expect(evaluate(`={{ ${root}.withHidden.meta }}`, native)).toBe(1);
					expect(evaluate(`={{ ${root}.withHidden + 1 }}`, native)).toBe(6);
					expect(evaluate(`={{ ${root}.withHidden instanceof Number }}`, native)).toBe(true);
					expect(evaluate(`={{ Object.keys(${root}.withHidden) }}`, native)).toEqual([]);
					expect(evaluate(`={{ ${root}.withHiddenAndEnum.secret }}`, native)).toBe(9);
					expect(evaluate(`={{ ${root}.withHiddenAndEnum.unit }}`, native)).toBe('kg');
					expect(evaluate(`={{ Object.keys(${root}.withHiddenAndEnum) }}`, native)).toEqual([
						'0',
						'1',
						'unit',
					]);
				},
			);

			it.each([
				['={{ $json.s instanceof String }}', true],
				['={{ $json.n instanceof Number }}', true],
				['={{ $json.b instanceof Boolean }}', true],
				['={{ $json.bi instanceof BigInt }}', true],
				['={{ $json.s.length }}', 2],
				['={{ $json.s[0] }}', 'a'],
				['={{ $json.s.toUpperCase() }}', 'AB'],
				['={{ $json.n.toFixed(1) }}', '5.0'],
				['={{ $json.s + "!" }}', 'ab!'],
				['={{ $json.n + 1 }}', 6],
				['={{ +$json.n }}', 5],
				['={{ -$json.n }}', -5],
				['={{ !$json.b }}', false],
				['={{ !$json.bf }}', false],
				['={{ $json.bf ? "yes" : "no" }}', 'yes'],
				['={{ $json.s === "ab" }}', false],
				['={{ $json.s == "ab" }}', true],
				['={{ $json.n == 5 }}', true],
				['={{ $json.b == true }}', true],
				['={{ $json.s.toJsonString() }}', '"ab"'],
				["={{ $('Source').item.json.s.length }}", 2],
				["={{ $('Source').item.json.s.toUpperCase() }}", 'AB'],
				["={{ $('Source').item.json.n.toFixed(1) }}", '5.0'],
				["={{ $('Source').item.json.s + '!' }}", 'ab!'],
				["={{ $('Source').item.json.n + 1 }}", 6],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, native)).toBe(expected);
			});
		});
	});
});
