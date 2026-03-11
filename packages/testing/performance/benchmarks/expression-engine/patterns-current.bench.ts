/**
 * Tier 1: Current Engine (Tournament) Pattern Benchmarks
 *
 * Benchmarks expression evaluation through the full Workflow.expression path
 * using the current (Tournament) engine.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { Expression } from 'n8n-workflow';

import {
	createWorkflow,
	evaluate,
	makeSmallData,
	makeMediumData,
	makeLargeData,
	useCurrentEngine,
} from './fixtures/data';
import { definePatternBenchmarks } from './fixtures/pattern-benchmarks';

await useCurrentEngine();
if (Expression.getActiveImplementation() !== 'current') {
	throw new Error(`Engine not set to 'current' — got '${Expression.getActiveImplementation()}'`);
}

const workflow = createWorkflow();

definePatternBenchmarks(
	'current',
	workflow,
	evaluate,
	makeSmallData(),
	makeMediumData(),
	makeLargeData(),
);
