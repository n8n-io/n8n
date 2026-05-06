/**
 * Tier 1: QuickJS Engine Pattern Benchmarks
 *
 * Benchmarks expression evaluation through the full Workflow.expression path
 * using the QuickJS engine.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { afterAll } from 'vitest';
import { Expression } from 'n8n-workflow';

import {
	createWorkflow,
	evaluate,
	makeSmallData,
	makeMediumData,
	makeLargeData,
	useQuickJsEngine,
} from './fixtures/data';
import { definePatternBenchmarks } from './fixtures/pattern-benchmarks';

await useQuickJsEngine();
if (Expression.getActiveImplementation() !== 'quickjs') {
	throw new Error(`Engine not set to 'quickjs' — got '${Expression.getActiveImplementation()}'`);
}

const workflow = createWorkflow();
await workflow.expression.acquireIsolate();

afterAll(() => workflow.expression.releaseIsolate());

definePatternBenchmarks(
	'quickjs',
	workflow,
	evaluate,
	makeSmallData(),
	makeMediumData(),
	makeLargeData(),
);
