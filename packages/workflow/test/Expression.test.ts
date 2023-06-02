/**
 * @jest-environment jsdom
 */

import { DateTime, Duration, Interval } from 'luxon';
import { Expression } from '@/Expression';
import { Workflow } from '@/Workflow';
import * as Helpers from './Helpers';
import type { ExpressionTestEvaluation, ExpressionTestTransform } from './ExpressionFixtures/base';
import { baseFixtures } from './ExpressionFixtures/base';
import type { INodeExecutionData } from '@/Interfaces';
import { extendSyntax } from '@/Extensions/ExpressionExtension';

describe('Expression', () => {
	describe('getParameterValue()', () => {
		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1234',
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		const expression = new Expression(workflow);

		const evaluate = (value: string) =>
			expression.getParameterValue(value, null, 0, 0, 'node', [], 'manual', '', {});

		it('should not be able to use global built-ins from denylist', () => {
			expect(evaluate('={{document}}')).toEqual({});
			expect(evaluate('={{window}}')).toEqual({});

			expect(evaluate('={{Window}}')).toEqual({});
			expect(evaluate('={{globalThis}}')).toEqual({});
			expect(evaluate('={{self}}')).toEqual({});

			expect(evaluate('={{alert}}')).toEqual({});
			expect(evaluate('={{prompt}}')).toEqual({});
			expect(evaluate('={{confirm}}')).toEqual({});

			expect(evaluate('={{eval}}')).toEqual({});
			expect(evaluate('={{uneval}}')).toEqual({});
			expect(evaluate('={{setTimeout}}')).toEqual({});
			expect(evaluate('={{setInterval}}')).toEqual({});
			expect(evaluate('={{Function}}')).toEqual({});

			expect(evaluate('={{fetch}}')).toEqual({});
			expect(evaluate('={{XMLHttpRequest}}')).toEqual({});

			expect(evaluate('={{Promise}}')).toEqual({});
			expect(evaluate('={{Generator}}')).toEqual({});
			expect(evaluate('={{GeneratorFunction}}')).toEqual({});
			expect(evaluate('={{AsyncFunction}}')).toEqual({});
			expect(evaluate('={{AsyncGenerator}}')).toEqual({});
			expect(evaluate('={{AsyncGeneratorFunction}}')).toEqual({});

			expect(evaluate('={{WebAssembly}}')).toEqual({});

			expect(evaluate('={{Reflect}}')).toEqual({});
			expect(evaluate('={{Proxy}}')).toEqual({});

			expect(evaluate('={{constructor}}')).toEqual({});

			expect(evaluate('={{escape}}')).toEqual({});
			expect(evaluate('={{unescape}}')).toEqual({});
		});

		it('should be able to use global built-ins from allowlist', () => {
			expect(evaluate('={{new Date()}}')).toBeInstanceOf(Date);
			expect(evaluate('={{DateTime.now().toLocaleString()}}')).toEqual(
				DateTime.now().toLocaleString(),
			);
			expect(evaluate('={{Interval.after(new Date(), 100)}}')).toEqual(
				Interval.after(new Date(), 100),
			);
			expect(evaluate('={{Duration.fromMillis(100)}}')).toEqual(Duration.fromMillis(100));

			expect(evaluate('={{new Object()}}')).toEqual(new Object());

			expect(evaluate('={{new Array()}}')).toEqual([]);
			expect(evaluate('={{new Int8Array()}}')).toEqual(new Int8Array());
			expect(evaluate('={{new Uint8Array()}}')).toEqual(new Uint8Array());
			expect(evaluate('={{new Uint8ClampedArray()}}')).toEqual(new Uint8ClampedArray());
			expect(evaluate('={{new Int16Array()}}')).toEqual(new Int16Array());
			expect(evaluate('={{new Uint16Array()}}')).toEqual(new Uint16Array());
			expect(evaluate('={{new Int32Array()}}')).toEqual(new Int32Array());
			expect(evaluate('={{new Uint32Array()}}')).toEqual(new Uint32Array());
			expect(evaluate('={{new Float32Array()}}')).toEqual(new Float32Array());
			expect(evaluate('={{new Float64Array()}}')).toEqual(new Float64Array());
			expect(evaluate('={{new BigInt64Array()}}')).toEqual(new BigInt64Array());
			expect(evaluate('={{new BigUint64Array()}}')).toEqual(new BigUint64Array());

			expect(evaluate('={{new Map()}}')).toEqual(new Map());
			expect(evaluate('={{new WeakMap()}}')).toEqual(new WeakMap());
			expect(evaluate('={{new Set()}}')).toEqual(new Set());
			expect(evaluate('={{new WeakSet()}}')).toEqual(new WeakSet());

			expect(evaluate('={{new Error()}}')).toEqual(new Error());
			expect(evaluate('={{new TypeError()}}')).toEqual(new TypeError());
			expect(evaluate('={{new SyntaxError()}}')).toEqual(new SyntaxError());
			expect(evaluate('={{new EvalError()}}')).toEqual(new EvalError());
			expect(evaluate('={{new RangeError()}}')).toEqual(new RangeError());
			expect(evaluate('={{new ReferenceError()}}')).toEqual(new ReferenceError());
			expect(evaluate('={{new URIError()}}')).toEqual(new URIError());

			expect(evaluate('={{Intl}}')).toEqual(Intl);

			expect(evaluate('={{new String()}}')).toEqual(new String());
			expect(evaluate("={{new RegExp('')}}")).toEqual(new RegExp(''));

			expect(evaluate('={{Math}}')).toEqual(Math);
			expect(evaluate('={{new Number()}}')).toEqual(new Number());
			expect(evaluate("={{BigInt('1')}}")).toEqual(BigInt('1'));
			expect(evaluate('={{Infinity}}')).toEqual(Infinity);
			expect(evaluate('={{NaN}}')).toEqual(NaN);
			expect(evaluate('={{isFinite(1)}}')).toEqual(isFinite(1));
			expect(evaluate('={{isNaN(1)}}')).toEqual(isNaN(1));
			expect(evaluate("={{parseFloat('1')}}")).toEqual(parseFloat('1'));
			expect(evaluate("={{parseInt('1', 10)}}")).toEqual(parseInt('1', 10));

			expect(evaluate('={{JSON.stringify({})}}')).toEqual(JSON.stringify({}));
			expect(evaluate('={{new ArrayBuffer(10)}}')).toEqual(new ArrayBuffer(10));
			expect(evaluate('={{new SharedArrayBuffer(10)}}')).toEqual(new SharedArrayBuffer(10));
			expect(evaluate('={{Atomics}}')).toEqual(Atomics);
			expect(evaluate('={{new DataView(new ArrayBuffer(1))}}')).toEqual(
				new DataView(new ArrayBuffer(1)),
			);

			expect(evaluate("={{encodeURI('https://google.com')}}")).toEqual(
				encodeURI('https://google.com'),
			);
			expect(evaluate("={{encodeURIComponent('https://google.com')}}")).toEqual(
				encodeURIComponent('https://google.com'),
			);
			expect(evaluate("={{decodeURI('https://google.com')}}")).toEqual(
				decodeURI('https://google.com'),
			);
			expect(evaluate("={{decodeURIComponent('https://google.com')}}")).toEqual(
				decodeURIComponent('https://google.com'),
			);

			expect(evaluate('={{Boolean(1)}}')).toEqual(Boolean(1));
			expect(evaluate('={{Symbol(1).toString()}}')).toEqual(Symbol(1).toString());
		});
	});

	describe('Test all expression value fixtures', () => {
		const nodeTypes = Helpers.NodeTypes();
		const workflow = new Workflow({
			nodes: [
				{
					name: 'node',
					typeVersion: 1,
					type: 'test.set',
					id: 'uuid-1234',
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});

		const expression = new Expression(workflow);

		const evaluate = (value: string, data: INodeExecutionData[]) => {
			return expression.getParameterValue(value, null, 0, 0, 'node', data, 'manual', '', {});
		};

		for (const t of baseFixtures) {
			if (!t.tests.some((test) => test.type === 'evaluation')) {
				continue;
			}
			test(t.expression, () => {
				for (const test of t.tests.filter(
					(test) => test.type === 'evaluation',
				) as ExpressionTestEvaluation[]) {
					expect(evaluate(t.expression, test.input.map((d) => ({ json: d })) as any)).toStrictEqual(
						test.output,
					);
				}
			});
		}
	});

	describe('Test all expression transform fixtures', () => {
		for (const t of baseFixtures) {
			if (!t.tests.some((test) => test.type === 'transform')) {
				continue;
			}
			test(t.expression, () => {
				for (const test of t.tests.filter(
					(test) => test.type === 'transform',
				) as ExpressionTestTransform[]) {
					const expr = t.expression;
					expect(extendSyntax(expr, test.forceTransform)).toEqual(test.result ?? expr);
				}
			});
		}
	});
});
