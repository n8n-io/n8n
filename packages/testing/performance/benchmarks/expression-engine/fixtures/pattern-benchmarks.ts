/**
 * Shared benchmark definitions for Tier 1 pattern benchmarks.
 * Used by both patterns-legacy.bench.ts and patterns-vm.bench.ts.
 *
 * NOTE: CodSpeed ignores describe block names, so every defineBench() name must be
 * globally unique. Each name is prefixed with `{engine}: {group} -` to ensure
 * that current and vm benchmarks are distinguishable in reports.
 */
import type { Workflow, INodeExecutionData } from 'n8n-workflow';

import { defineBench } from '../../bench-options';
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
	// The 10k-item map is ~5-6x slower on QuickJS (WASM); under CodSpeed's
	// instruction-counting instrumentation it exceeds the bridge timeout. Opt
	// out for that engine — the 100-item array cases still cover the pattern.
	{ includeLargeArray = true }: { includeLargeArray?: boolean } = {},
) {
	// Simple Property
	defineBench(`${engine}: Simple Property - small data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], smallData);
	});

	defineBench(`${engine}: Simple Property - medium data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], mediumData);
	});

	defineBench(`${engine}: Simple Property - large data`, () => {
		evalFn(workflow, SIMPLE_PROPERTY[0], largeData);
	});

	// Nested Property
	defineBench(`${engine}: Nested Property - depth 3`, () => {
		evalFn(workflow, NESTED_PROPERTY[0], smallData);
	});

	defineBench(`${engine}: Nested Property - depth 4`, () => {
		evalFn(workflow, NESTED_PROPERTY[1], smallData);
	});

	// Extension Call
	defineBench(`${engine}: Extension Call - toUpperCase`, () => {
		evalFn(workflow, EXTENSION_CALL[0], smallData);
	});

	defineBench(`${engine}: Extension Call - isEmpty`, () => {
		evalFn(workflow, EXTENSION_CALL[1], smallData);
	});

	// Array Iteration
	defineBench(`${engine}: Array Iteration - map 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[0], mediumData);
	});

	defineBench(`${engine}: Array Iteration - filter 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[1], mediumData);
	});

	defineBench(`${engine}: Array Iteration - filter+map 100 items`, () => {
		evalFn(workflow, ARRAY_ITERATION[2], mediumData);
	});

	if (includeLargeArray) {
		defineBench(`${engine}: Array Iteration - map 10k items`, () => {
			evalFn(workflow, ARRAY_ITERATION[0], largeData);
		});
	}

	// Conditional
	defineBench(`${engine}: Conditional - nullish coalescing`, () => {
		evalFn(workflow, CONDITIONAL[0], smallData);
	});

	defineBench(`${engine}: Conditional - ternary`, () => {
		evalFn(workflow, CONDITIONAL[1], smallData);
	});
}
