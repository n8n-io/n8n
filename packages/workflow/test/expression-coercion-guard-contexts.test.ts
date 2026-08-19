// @vitest-environment jsdom

import { Tournament } from '@n8n/tournament';

import { ExpressionError } from '../src/errors/expression.error';

import {
	DollarSignValidator,
	PrototypeSanitizer,
	ThisSanitizer,
	UndefinedCoercionGuard,
	guardPlus,
	guardTemplate,
	plusGuardName,
	templateGuardName,
	undefinedCoercionGateName,
} from '../src/expression-sandboxing';
import { Expression } from '../src/expression';

/**
 * `UndefinedCoercionGuard` emits `<data>.__guardPlus(...)` /
 * `<data>.__guardTemplate(...)` unconditionally, for every expression, on the
 * evaluator shared by the whole process. Guardrail 1 therefore covers more than
 * the node setting: every context that evaluates an expression has to supply
 * the runtime halves, and the transform must not change how errors escape.
 */
describe('UndefinedCoercionGuard — contexts outside _getNodeParameter', () => {
	/**
	 * `Expression.resolveWithoutWorkflow` evaluates against a caller-supplied
	 * plain object rather than a data proxy built by
	 * `resolveSimpleParameterValue`. Production callers: the NDV/credentials
	 * expression preview (`useExpressionEditor`), external-secrets autocomplete,
	 * enterprise role-mapping rules (`role-resolver.service.ee.ts`) and the AI
	 * workflow builder's connection validation. No node and no setting is
	 * involved, so nothing here may change.
	 */
	describe('Expression.resolveWithoutWorkflow', () => {
		it.each([
			['a `+` between two literals', '{{ 1 + 2 }}', {}, 3],
			['a `+` reading the data object', "{{ a + 'x' }}", { a: 'hello' }, 'hellox'],
			['a template literal', '{{ `v=${a}` }}', { a: 1 }, 'v=1'],
			['a rule-shaped comparison', "{{ email + '' === 'a@b.c' }}", { email: 'a@b.c' }, true],
			['no `+` at all (control)', '{{ a }}', { a: 'ok' }, 'ok'],
			['a member access (control)', '{{ o.k }}', { o: { k: 'ok' } }, 'ok'],
		])('resolves %s', (_label, expression, data, expected) => {
			expect(Expression.resolveWithoutWorkflow(expression, data)).toEqual(expected);
		});
	});

	/**
	 * The injected guard is a `CallExpression`, and tournament decides whether to
	 * wrap an expression in its `tmpl`-compatibility try/catch *after* the AST
	 * hooks have run (`shouldWrapInTry`, `ExpressionBuilder.ts`). An expression
	 * that previously contained neither a call nor a member expression is now
	 * wrapped, which changes whether a runtime error reaches the caller.
	 */
	describe('error propagation is unchanged by the transform', () => {
		const dataContext = () => {
			const data: Record<string, unknown> = {};
			Object.defineProperties(data, {
				[undefinedCoercionGateName]: { value: false, configurable: true },
				[plusGuardName]: { value: guardPlus, configurable: true },
				[templateGuardName]: { value: guardTemplate, configurable: true },
			});
			return data;
		};

		const evaluate = (expression: string, withGuard: boolean) => {
			// Mirrors the production handler in `expression-evaluator-proxy.ts`:
			// only `ExpressionError` is rethrown, everything else is swallowed and
			// the expression resolves to `undefined`.
			const tournament = new Tournament(
				(error) => {
					if (error instanceof ExpressionError) throw error;
				},
				undefined,
				undefined,
				{
					before: [ThisSanitizer],
					after: withGuard
						? [PrototypeSanitizer, DollarSignValidator, UndefinedCoercionGuard]
						: [PrototypeSanitizer, DollarSignValidator],
				},
			);
			try {
				return { threw: false, value: tournament.execute(expression, dataContext()) };
			} catch (error) {
				return { threw: true, value: (error as Error).message };
			}
		};

		it.each([
			['mixing BigInt and Number', '{{ 1n + 1 }}'],
			['a plain arithmetic `+`', '{{ 1 + 2 }}'],
			['a template literal', '{{ `x${1}` }}'],
		])('%s behaves the same with and without the guard installed', (_label, expression) => {
			expect(evaluate(expression, true)).toEqual(evaluate(expression, false));
		});
	});
});
