import { defineConfig } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

// Tests that evaluate expressions, so their outcome depends on the engine.
// Only these run once per engine project; everything else runs once in the
// default project. A test outside this list that evaluates an expression fails
// there (see test/setup-vm-evaluator.ts), so the list cannot drift silently.
const ENGINE_TESTS = [
	'test/expression.test.ts',
	'test/expression-array-proxy-semantics.test.ts',
	'test/expression-compatibility.test.ts',
	'test/expression-engine-start-failure.test.ts',
	'test/expression-item-accessor-engine-parity.test.ts',
	'test/expression-items-engine-parity.test.ts',
	'test/expression-nested-data.test.ts',
	'test/expression-vm-errors.test.ts',
	'test/expression-with-isolate.test.ts',
	'test/ExpressionExtensions/*.test.ts',
	'test/native-evaluation-fuzz.test.ts',
	'test/native-evaluation-parity.test.ts',
	'test/webhook-description-fields.test.ts',
	'test/workflow.test.ts',
	'test/workflow-data-proxy.test.ts',
	'test/workflow-expression.test.ts',
];

const { reporters, outputFile, ...sharedTestConfig } = createBaseInlineConfig({
	include: ['test/**/*.test.ts'],
	setupFiles: ['./test/setup-vm-evaluator.ts'],
});

const engineProject = (engine: 'vm' | 'legacy' | 'quickjs') => ({
	test: {
		...sharedTestConfig,
		include: ENGINE_TESTS,
		name: `${engine}-engine`,
		env: { N8N_EXPRESSION_ENGINE: engine },
	},
});

export default defineConfig({
	test: {
		reporters,
		outputFile,
		projects: [
			{
				test: {
					...sharedTestConfig,
					exclude: [...(sharedTestConfig.exclude ?? []), ...ENGINE_TESTS],
					name: 'default',
					// Explicitly no engine, so a shell N8N_EXPRESSION_ENGINE cannot turn
					// this project into a fourth engine run and disable the guard.
					env: { N8N_EXPRESSION_ENGINE: '' },
				},
			},
			engineProject('vm'),
			engineProject('legacy'),
			engineProject('quickjs'),
		],
	},
});
