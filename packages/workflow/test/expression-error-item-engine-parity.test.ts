// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { NodeApiError } from '../src/errors/node-api.error';
import { Expression } from '../src/expression';
import type { INode } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// A node that continues on fail puts an Error instance in its output item: at
// the item root for declarative nodes, under `json.error` for HTTP Request.
// Every engine and native evaluation must read that Error as legacy does.

describe('Expression - Error instances in item data (engine parity)', () => {
	const sourceNode: INode = {
		name: 'Source',
		typeVersion: 1,
		type: 'test.set',
		id: 'source-1',
		position: [0, 0],
		parameters: {},
	};
	const workflow = new Workflow({
		id: '1',
		nodes: [
			sourceNode,
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'current-1',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: {
			Source: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const apiError = () =>
		new NodeApiError(sourceNode, { message: 'Bad request' }, { description: 'Invalid recipient' });

	const rootErrorItem = { json: {}, error: apiError(), pairedItem: { item: 0 } };
	const jsonErrorItem = { json: { error: apiError() }, pairedItem: { item: 0 } };
	const errorFlagItem = {
		json: { flag: { __isError: true, message: 'hi', cause: apiError() } },
		pairedItem: { item: 0 },
	};
	const awkwardErrorItem = () => {
		const shared: Record<string, unknown> = { name: 'shared' };
		shared.self = shared;
		const error = Object.assign(new Error('Outer', { cause: new Error('Inner') }), {
			context: { retry: () => {}, shared },
		});
		return { json: { error }, pairedItem: { item: 0 } };
	};

	const evaluate = (expr: string, item: object, native: boolean) => {
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
		describe('Error at the item root', () => {
			it.each([
				["={{ $('Source').item.json.error ? 'failed' : 'sent' }}", 'sent'],
				["={{ $('Source').item.error.message }}", 'Bad request'],
				["={{ $('Source').first().error.description }}", 'Invalid recipient'],
				["={{ $('Source').all()[0].error.name }}", 'NodeApiError'],
				["={{ $('Source').item.error instanceof Error }}", true],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, rootErrorItem, native)).toBe(expected);
			});
		});

		describe('Error under json.error', () => {
			it.each([
				["={{ $('Source').item.json.error ? 'failed' : 'sent' }}", 'failed'],
				[
					"=Failed: {{ $('Source').item.json.error?.description ?? $('Source').item.json.error?.message ?? 'unknown' }}",
					'Failed: Invalid recipient',
				],
				["={{ $('Source').item.json.error.message }}", 'Bad request'],
				["={{ $('Source').last().json.error.httpCode }}", null],
				['={{ $input.first().json.error.message }}', 'Bad request'],
				['={{ $json.error.message }}', 'Bad request'],
				['={{ $json.error.name }}', 'NodeApiError'],
				['={{ $json.error.description }}', 'Invalid recipient'],
				['={{ $json.error instanceof Error }}', true],
				['={{ String($json.error) }}', 'NodeApiError: Bad request'],
				['={{ Object.keys($json.error).includes("description") }}', true],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, jsonErrorItem, native)).toBe(expected);
			});
		});

		describe('Error with a cause, a function and a cycle in its keys', () => {
			it.each([
				['={{ $json.error.message }}', 'Outer'],
				['={{ $json.error.cause?.message }}', 'Inner'],
				["={{ $('Source').item.json.error.cause?.message }}", 'Inner'],
				['={{ $json.error.context.shared.name }}', 'shared'],
				["=Error: {{ $('Source').item.json.error.context.shared.name }}", 'Error: shared'],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, awkwardErrorItem(), native)).toBe(expected);
			});

			it('keeps the cause of a NodeApiError that wraps a native error', () => {
				const item = {
					json: { error: new NodeApiError(sourceNode, new Error('Inner') as never) },
					pairedItem: { item: 0 },
				};

				expect(evaluate('={{ $json.error.cause?.message }}', item, native)).toBe('Inner');
			});

			it('does not read a host object in the cause of an Error', () => {
				class Socket {
					constructor() {
						Object.defineProperty(this, 'state', {
							enumerable: true,
							get: () => {
								throw new Error('closed');
							},
						});
					}
				}
				const cause = Object.assign(new Error('Inner'), { request: new Socket() });
				const item = {
					json: { x: 'ok' },
					error: new NodeApiError(sourceNode, cause as never),
					pairedItem: { item: 0 },
				};

				expect(evaluate("={{ $('Source').item.json.x }}", item, native)).toBe('ok');
				expect(evaluate("={{ $('Source').item.error.cause.message }}", item, native)).toBe('Inner');
			});
		});

		describe('Item that holds an Error and a __proto__ key', () => {
			const item = {
				json: { error: new Error('x'), body: JSON.parse('{"__proto__":{"a":1}}') },
				pairedItem: { item: 0 },
			};

			it("={{ $('Source').item.json.body.a }}", () => {
				expect(evaluate("={{ $('Source').item.json.body.a }}", item, native)).toBeUndefined();
			});

			it('keeps the own JSON key and its value', () => {
				const result = evaluate("={{ $('Source').item.json.body }}", item, native);

				expect(Object.hasOwn(result as object, '__proto__')).toBe(true);
				expect(result).toStrictEqual(item.json.body);
			});
		});

		describe('Error inside data that holds the error flag', () => {
			it.each([
				// Split braces, so the outer template does not end at the inner one.
				["={{ $evaluateExpression('{' + '{ $json.flag }' + '}').message }}", 'hi'],
				["={{ $evaluateExpression('{' + '{ $json.flag }' + '}').cause.message }}", 'Bad request'],
			])('%s', (expr, expected) => {
				expect(evaluate(expr, errorFlagItem, native)).toBe(expected);
			});
		});

		describe('Error returned by the expression', () => {
			it('serializes fields changed inside the expression', () => {
				const error = apiError();
				const expected = {
					...error.toJSON!(),
					message: 'changed',
					description: 'x',
					context: { attempt: 2 },
				};
				const item = { json: { error }, pairedItem: { item: 0 } };

				const result = evaluate(
					'={{ (() => { const e = $json.error; e.message = "changed"; e.description = "x"; e.context = { attempt: 2 }; return JSON.stringify(e) })() }}',
					item,
					native,
				);

				expect(result).toBe(JSON.stringify(expected));
			});

			it('serializes fields changed after the Error returns to the host', () => {
				const error = apiError();
				const expected = {
					...error.toJSON!(),
					message: 'changed',
					description: 'x',
					context: { attempt: 2 },
				};
				const item = { json: { error }, pairedItem: { item: 0 } };
				const result = evaluate('={{ $json.error }}', item, native) as unknown as NodeApiError;

				result.message = 'changed';
				result.description = 'x';
				result.context = { attempt: 2 };

				expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
			});

			it.each(['={{ $json.error }}', "={{ $('Source').item.json.error }}"])('%s', (expr) => {
				const result = evaluate(expr, jsonErrorItem, native);

				expect(result).toBeInstanceOf(Error);
				expect(result).toMatchObject({ name: 'NodeApiError', message: 'Bad request' });
				expect(JSON.stringify(result)).toBe(JSON.stringify(jsonErrorItem.json.error));
			});

			it('keeps the special values in the keys of the Error', () => {
				const result = evaluate(
					"={{ Object.assign(new Error('x', { cause: new Error('y') }), { at: new Date(0), ratio: NaN, map: new Map([['a', 1]]), data: { __isDate: true, __isoString: 'no' } }) }}",
					jsonErrorItem,
					native,
				) as Error & Record<string, unknown>;

				expect(result.at).toEqual(new Date(0));
				expect(result.ratio).toBeNaN();
				expect(result.map).toEqual(new Map([['a', 1]]));
				expect(result.data).toEqual({ __isDate: true, __isoString: 'no' });
				expect(result.cause).toMatchObject({ message: 'y' });
			});

			it('returns an Error that holds itself', () => {
				const result = evaluate(
					"={{ (() => { const e = new Error('x'); e.self = e; return e })() }}",
					jsonErrorItem,
					native,
				);

				expect(result).toMatchObject({ message: 'x' });
			});

			it('keeps the class of a standard error', () => {
				const result = evaluate("={{ new TypeError('x') }}", jsonErrorItem, native);

				expect(result).toBeInstanceOf(TypeError);
				expect(result).toMatchObject({ message: 'x' });
			});
		});
	});
});
