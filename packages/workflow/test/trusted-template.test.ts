import * as Helpers from './helpers';
import { Workflow } from '../src/workflow';

// Tests for trusted-template evaluation (`Expression.runAsTrustedTemplate`,
// `WorkflowExpression.getTrusted{Simple,Complex}ParameterValue`).
//
// Trusted templates are node-description-authored (e.g. `webhookDescription`
// fields such as `={{$parameter["responseMode"]}}`). They are evaluated with
// the in-process (legacy) engine even when the VM engine is enabled, so they
// need no isolate. The security invariant is that trust applies only to
// top-level templates evaluated within the trusted call: user-authored
// expressions resolved while rendering (via `$parameter`) run at nested
// evaluation depth and must still go through the sandboxed VM engine.
//
// This file runs under both vitest projects (legacy-engine and vm-engine, see
// vitest.config.ts). VM-only assertions are gated with `it.runIf(isVm)` —
// they prove sandbox routing by the fact that a VM evaluation without an
// acquired isolate throws, while a trusted (legacy-routed) one succeeds.

const isVm = process.env.N8N_EXPRESSION_ENGINE === 'vm';

describe('trusted template evaluation', () => {
	// `test.set` declares two string properties: value1 (plain value here)
	// and value2 (holding a user-authored expression here).
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Webhook',
				typeVersion: 1,
				type: 'test.set',
				id: 'webhook-1',
				position: [0, 0],
				parameters: {
					value1: 'hello',
					value2: '={{ 1 + 1 }}',
				},
			},
		],
		connections: {},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const node = workflow.getNode('Webhook')!;
	const expression = workflow.expression;

	// NOTE: no `acquireIsolate()` in the outer scope — proving that trusted
	// templates evaluate without one is the point of this suite.

	describe('without an acquired isolate', () => {
		it('evaluates a trusted template reading a plain parameter', () => {
			const result = expression.getTrustedSimpleParameterValue(
				node,
				'={{ $parameter["value1"] }}',
				'internal',
				{},
			);
			expect(result).toBe('hello');
		});

		it('evaluates a trusted template with an inlined function body', () => {
			// Mirrors real webhook descriptions like `={{(fn)($parameter)}}`
			const result = expression.getTrustedSimpleParameterValue(
				node,
				'={{ (function (p) { return p.value1 + "!"; })($parameter) }}',
				'internal',
				{},
			);
			expect(result).toBe('hello!');
		});

		it('returns non-expression values as-is', () => {
			expect(expression.getTrustedSimpleParameterValue(node, 'plain-string', 'internal', {})).toBe(
				'plain-string',
			);
			expect(
				expression.getTrustedSimpleParameterValue(node, undefined, 'internal', {}, undefined, true),
			).toBe(true);
		});

		it.runIf(isVm)('untrusted evaluation still requires an isolate under the VM engine', () => {
			expect(() =>
				expression.getSimpleParameterValue(node, '={{ $parameter["value1"] }}', 'internal', {}),
			).toThrow();
		});

		it.runIf(isVm)('user expressions nested in a trusted template do NOT inherit trust', () => {
			// `$parameter["value2"]` resolves a user-authored `={{ 1 + 1 }}`.
			// That nested evaluation must run on the VM engine, which fails here
			// because no isolate is acquired (the failure surfaces as a nullish
			// result). If the trusted flag were inherited, the nested expression
			// would evaluate in-process and return 2 — see the acquired-isolate
			// suite below for the positive case.
			const result = expression.getTrustedSimpleParameterValue(
				node,
				'={{ $parameter["value2"] }}',
				'internal',
				{},
			);
			expect([null, undefined]).toContain(result);
		});

		it('evaluates every template in a trusted complex value, not just the first', () => {
			const result = expression.getTrustedComplexParameterValue(
				node,
				{
					first: '={{ $parameter["value1"] }}',
					second: '={{ $parameter["value1"] + "!" }}',
					list: ['={{ $parameter["value1"] }}'],
				},
				'internal',
				{},
			);
			expect(result).toEqual({ first: 'hello', second: 'hello!', list: ['hello'] });
		});

		it('stays trusted after a template throws mid-evaluation', () => {
			expect(() =>
				expression.getTrustedSimpleParameterValue(node, '={{ this is not js }}', 'internal', {}),
			).toThrow();
			const result = expression.getTrustedSimpleParameterValue(
				node,
				'={{ $parameter["value1"] }}',
				'internal',
				{},
			);
			expect(result).toBe('hello');
		});

		it.runIf(isVm)('trust ends with the trusted call and does not leak to later ones', () => {
			expression.getTrustedSimpleParameterValue(
				node,
				'={{ $parameter["value1"] }}',
				'internal',
				{},
			);
			expect(() =>
				expression.getSimpleParameterValue(node, '={{ $parameter["value1"] }}', 'internal', {}),
			).toThrow();
		});

		it.runIf(isVm)('trust does not linger when the trusted value is not an expression', () => {
			expression.getTrustedSimpleParameterValue(node, 'plain-string', 'internal', {});
			expect(() =>
				expression.getSimpleParameterValue(node, '={{ $parameter["value1"] }}', 'internal', {}),
			).toThrow();
		});
	});

	describe('with an acquired isolate', () => {
		beforeAll(async () => {
			await expression.acquireIsolate();
		});
		afterAll(async () => {
			await expression.releaseIsolate();
		});

		it('resolves user expressions nested in a trusted template (on the active engine)', () => {
			const result = expression.getTrustedSimpleParameterValue(
				node,
				'={{ $parameter["value2"] }}',
				'internal',
				{},
			);
			expect(result).toBe(2);
		});

		it('trusted and untrusted evaluation produce identical results', () => {
			const template = '={{ $parameter["value1"] }}';
			expect(expression.getTrustedSimpleParameterValue(node, template, 'internal', {})).toEqual(
				expression.getSimpleParameterValue(node, template, 'internal', {}),
			);
		});

		it('getTrustedComplexParameterValue resolves object-returning templates', () => {
			const result = expression.getTrustedComplexParameterValue(
				node,
				'={{ { nested: $parameter["value1"] } }}',
				'internal',
				{},
			);
			expect(result).toEqual({ nested: 'hello' });
		});
	});
});
