/**
 * Shared benchmark definitions for Tier 1 pattern benchmarks.
 * Used by both patterns-legacy.bench.ts and patterns-vm.bench.ts.
 *
 * NOTE: CodSpeed ignores describe block names, so every bench() name must be
 * globally unique. Each name is prefixed with `{engine}: {group} -` to ensure
 * that current and vm benchmarks are distinguishable in reports.
 */
import { bench } from 'vitest';
import type { Workflow, INodeExecutionData } from 'n8n-workflow';

import {
	SIMPLE_PROPERTY,
	NESTED_PROPERTY,
	EXTENSION_CALL,
	ARRAY_ITERATION,
	CONDITIONAL,
} from './expressions';

type EvalFn = (workflow: Workflow, expr: string, data: INodeExecutionData[]) => unknown;

export function definePatternBenchmarks(
	engine: string,
	workflow: Workflow,
	evalFn: EvalFn,
	smallData: INodeExecutionData[],
	mediumData: INodeExecutionData[],
	largeData: INodeExecutionData[],
) {
	// Simple Property
	bench(`${engine}: Simple Property - small data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], smallData);
	});

	bench(`${engine}: Simple Property - medium data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], mediumData);
	});

	bench(`${engine}: Simple Property - large data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], largeData);
	});

	// Nested Property
	bench(`${engine}: Nested Property - depth 3`, () => {
		evalFn(workflow, NESTED_PROPERTY[0], smallData);
	});

	bench(`${engine}: Nested Property - depth 4`, () => {
		evalFn(workflow, NESTED_PROPERTY[1], smallData);
	});

	// Extension Call
	bench(`${engine}: Extension Call - toUpperCase`, () => {
		evalFn(workflow, EXTENSION_CALL[0], smallData);
	});

	bench(`${engine}: Extension Call - isEmpty`, () => {
		evalFn(workflow, EXTENSION_CALL[1], smallData);
	});

	// Array Iteration
	bench(`${engine}: Array Iteration - map 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[0], mediumData);
	});

	bench(`${engine}: Array Iteration - filter 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[1], mediumData);
	});

	bench(`${engine}: Array Iteration - filter+map 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[2], mediumData);
	});

	bench(`${engine}: Array Iteration - map 10k items`, () => {
		evalFn(workflow, ARRAY_ITERATION[0], largeData);
	});

	// Conditional
	bench(`${engine}: Conditional - nullish coalescing`, () => {
		evalFn(workflow, CONDITIONAL[0], smallData);
	});

	bench(`${engine}: Conditional - ternary`, () => {
		evalFn(workflow, CONDITIONAL[1], smallData);
	});
}
