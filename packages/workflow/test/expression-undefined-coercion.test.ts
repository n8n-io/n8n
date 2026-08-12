// @vitest-environment jsdom

import * as Helpers from './helpers';
import { ExpressionError } from '../src/errors/expression.error';
import type { INodeExecutionData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

/**
 * Case B of the `throwOnUndefinedExpression` node setting: `undefined` coerced
 * into the text "undefined" *inside* an expression.
 *
 * This file lives in `packages/workflow/test/` so vitest runs it under both the
 * `legacy-engine` and `vm-engine` projects (see vitest.config.ts) — the setting
 * has to behave identically on both, and a divergence fails one project only.
 */
/** See the note in the core-side test: `${` in a quoted string and a bare
 * backtick string are both rejected by lint, so the path is interpolated. */
const templateExpression = (inner: string) => `={{ \`Hi \${${inner}}\` }}`;
const taggedTemplateExpression = (inner: string) => `={{ String.raw\`Hi \${${inner}}\` }}`;

describe('Expression — undefined coercion guard (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
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
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const json = { present: 'value', nullish: null, zero: 0, text: 'undefined' };

	const evaluate = (value: string, throwOnUndefinedCoercion: boolean) => {
		const data: INodeExecutionData[] = [{ json }];
		return expression.getParameterValue(
			value,
			null,
			0,
			0,
			'node',
			data,
			'manual',
			{},
			undefined,
			false,
			{},
			undefined,
			throwOnUndefinedCoercion,
		);
	};

	const on = (value: string) => evaluate(value, true);
	const off = (value: string) => evaluate(value, false);

	describe('setting ON — fails instead of emitting "undefined"', () => {
		it.each([
			['`+` with the missing value on the right', "={{ 'Hi ' + $json.missing }}"],
			['`+` with the missing value on the left', "={{ $json.missing + ' Hi' }}"],
			['template literal', templateExpression('$json.missing')],
			['nested `+`, outer operand missing', "={{ 'a' + 'b' + $json.missing }}"],
			['nested `+`, inner operand missing', "={{ 'a' + $json.missing + 'b' }}"],
			['`+` inside a template literal', templateExpression("'x' + $json.missing")],
			['`+` on an explicitly undefined key', "={{ 'Hi ' + $json.explicitUndefined }}"],
		])('throws on %s', (_label, value) => {
			expect(() => on(value)).toThrow(ExpressionError);
		});

		it('carries the undefined_coercion type and an actionable description', () => {
			let caught: unknown;
			try {
				on("={{ 'Hi ' + $json.missing }}");
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(ExpressionError);
			const error = caught as ExpressionError;
			expect(error.context.type).toBe('undefined_coercion');
			expect(error.message).toBe('Expression inserted "undefined" into text');
			expect(error.description).toContain("?? ''");
		});

		it('distinguishes the two coercion sites in the description', () => {
			const plus = (() => {
				try {
					on("={{ 'Hi ' + $json.missing }}");
				} catch (error) {
					return error as ExpressionError;
				}
				throw new Error('expected a throw');
			})();
			const template = (() => {
				try {
					on(templateExpression('$json.missing'));
				} catch (error) {
					return error as ExpressionError;
				}
				throw new Error('expected a throw');
			})();

			expect(plus.description).toContain('`+`');
			expect(template.description).toContain('template literal');
		});
	});

	// Guardrail 3 in the spec: a false positive fails a workflow that was
	// working correctly, which is worse than the bug being fixed.
	describe('setting ON — must never fire', () => {
		it.each([
			['nullish coalescing', "={{ $json.missing ?? 'x' }}", 'x'],
			['optional chaining', '={{ $json.a?.b }}', undefined],
			['explicit undefined comparison', '={{ $json.missing === undefined }}', true],
			['typeof guard', "={{ typeof $json.missing !== 'undefined' }}", false],
			['numeric addition yielding NaN', '={{ 1 + $json.missing }}', NaN],
			['Array#join', '={{ [1, $json.missing].join() }}', '1,'],
			['null concatenation', "={{ $json.nullish + ' x' }}", 'null x'],
			['zero concatenation', "={{ 'n=' + $json.zero }}", 'n=0'],
			['data that literally reads "undefined"', "={{ 'Hi ' + $json.text }}", 'Hi undefined'],
			['a fallback that fills the hole', "={{ 'Hi ' + ($json.missing ?? '') }}", 'Hi '],
			['interpolation outside a code chunk', '=Hello, {{ $json.missing }}', 'Hello, '],
			['a tagged template', taggedTemplateExpression('$json.missing'), 'Hi undefined'],
		])('does not throw on %s', (_label, value, expected) => {
			expect(on(value)).toEqual(expected);
		});
	});

	// Guardrail 1: with the setting off the throwing branch must be unreachable
	// and every result byte-identical to master.
	describe('setting OFF — behaviour unchanged', () => {
		it.each([
			["={{ 'Hi ' + $json.missing }}", 'Hi undefined'],
			["={{ $json.missing + ' Hi' }}", 'undefined Hi'],
			[templateExpression('$json.missing'), 'Hi undefined'],
			["={{ 'a' + 'b' + $json.missing }}", 'abundefined'],
			['={{ 1 + $json.missing }}', NaN],
			['={{ [1, $json.missing].join() }}', '1,'],
			["={{ $json.missing ?? 'x' }}", 'x'],
			['=Hello, {{ $json.missing }}', 'Hello, '],
			["={{ 'Hi ' + $json.text }}", 'Hi undefined'],
		])('%s resolves to the same value as before', (value, expected) => {
			expect(off(value)).toEqual(expected);
		});

		it('is the default when the flag is not passed at all', () => {
			const data: INodeExecutionData[] = [{ json }];
			expect(
				expression.getParameterValue(
					"={{ 'Hi ' + $json.missing }}",
					null,
					0,
					0,
					'node',
					data,
					'manual',
					{},
				),
			).toBe('Hi undefined');
		});
	});

	// The guard applies the `+` operator itself rather than reimplementing it,
	// so these have to keep matching plain JavaScript on both engines.
	describe('`+` semantics are untouched', () => {
		it.each([
			['string + string', "={{ 'a' + 'b' }}", 'ab'],
			['number + number', '={{ 1 + 2 }}', 3],
			['number + string', "={{ 1 + '2' }}", '12'],
			['string + number', "={{ '1' + 2 }}", '12'],
			['null + number', '={{ null + 1 }}', 1],
			['boolean + number', '={{ true + 1 }}', 2],
			['array + string', "={{ [1,2] + 'x' }}", '1,2x'],
			['unary plus is not a binary +', "={{ +'3' + 1 }}", 4],
		])('%s is unchanged with the setting on', (_label, value, expected) => {
			expect(on(value)).toEqual(expected);
		});

		it('evaluates operands left to right exactly once', () => {
			const order = '={{ [1,2,3].map(n => n).join("") + [4,5].map(n => n).join("") }}';
			expect(on(order)).toBe('12345');
		});
	});
});
