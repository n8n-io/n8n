/**
 * Tier 1: VM Engine (isolated-vm) Pattern Benchmarks
 *
 * Benchmarks expression evaluation through the full Workflow.expression path
 * using the VM (isolated-vm) engine.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { describe } from 'vitest';
import { Expression } from 'n8n-workflow';

import {
	createWorkflow,
	evaluate,
	makeSmallData,
	makeMediumData,
	makeLargeData,
	useVmEngine,
} from './fixtures/data';
import { definePatternBenchmarks } from './fixtures/pattern-benchmarks';

await useVmEngine();
if (Expression.getActiveImplementation() !== 'vm') {
	throw new Error(`Engine not set to 'vm' — got '${Expression.getActiveImplementation()}'`);
}

const workflow = createWorkflow();

describe('vm', () => {
	definePatternBenchmarks(workflow, evaluate, makeSmallData(), makeMediumData(), makeLargeData());
});
