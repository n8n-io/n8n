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

import { BENCH_OPTIONS } from '../../bench-options';
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
	bench(
		`${engine}: Simple Property - small data`,
		() => {
			evalFn(workflow, SIMPLE_PROPERTY[0], smallData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Simple Property - medium data`,
		() => {
			evalFn(workflow, SIMPLE_PROPERTY[0], mediumData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Simple Property - large data`,
		() => {
			evalFn(workflow, SIMPLE_PROPERTY[0], largeData);
		},
		BENCH_OPTIONS,
	);

	// Nested Property
	bench(
		`${engine}: Nested Property - depth 3`,
		() => {
			evalFn(workflow, NESTED_PROPERTY[0], smallData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Nested Property - depth 4`,
		() => {
			evalFn(workflow, NESTED_PROPERTY[1], smallData);
		},
		BENCH_OPTIONS,
	);

	// Extension Call
	bench(
		`${engine}: Extension Call - toUpperCase`,
		() => {
			evalFn(workflow, EXTENSION_CALL[0], smallData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Extension Call - isEmpty`,
		() => {
			evalFn(workflow, EXTENSION_CALL[1], smallData);
		},
		BENCH_OPTIONS,
	);

	// Array Iteration
	bench(
		`${engine}: Array Iteration - map 100 items`,
		() => {
			evalFn(workflow, ARRAY_ITERATION[0], mediumData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Array Iteration - filter 100 items`,
		() => {
			evalFn(workflow, ARRAY_ITERATION[1], mediumData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Array Iteration - filter+map 100 items`,
		() => {
			evalFn(workflow, ARRAY_ITERATION[2], mediumData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Array Iteration - map 10k items`,
		() => {
			evalFn(workflow, ARRAY_ITERATION[0], largeData);
		},
		BENCH_OPTIONS,
	);

	// Conditional
	bench(
		`${engine}: Conditional - nullish coalescing`,
		() => {
			evalFn(workflow, CONDITIONAL[0], smallData);
		},
		BENCH_OPTIONS,
	);

	bench(
		`${engine}: Conditional - ternary`,
		() => {
			evalFn(workflow, CONDITIONAL[1], smallData);
		},
		BENCH_OPTIONS,
	);
}
