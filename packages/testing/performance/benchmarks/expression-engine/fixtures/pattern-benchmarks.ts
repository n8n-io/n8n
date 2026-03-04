/**
 * Shared benchmark definitions for Tier 1 pattern benchmarks.
 * Used by both patterns-current.bench.ts and patterns-vm.bench.ts.
 */
import { bench, describe } from 'vitest';
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
	workflow: Workflow,
	evalFn: EvalFn,
	smallData: INodeExecutionData[],
	mediumData: INodeExecutionData[],
	largeData: INodeExecutionData[],
) {
	describe('Simple Property', () => {
		bench('small data', () => {
			evalFn(workflow, SIMPLE_PROPERTY[0], smallData);
		});

		bench('medium data', () => {
			evalFn(workflow, SIMPLE_PROPERTY[0], mediumData);
		});

		bench('large data', () => {
			evalFn(workflow, SIMPLE_PROPERTY[0], largeData);
		});
	});

	describe('Nested Property', () => {
		bench('depth 3', () => {
			evalFn(workflow, NESTED_PROPERTY[0], smallData);
		});

		bench('depth 4', () => {
			evalFn(workflow, NESTED_PROPERTY[1], smallData);
		});
	});

	describe('Extension Call', () => {
		bench('toUpperCase', () => {
			evalFn(workflow, EXTENSION_CALL[0], smallData);
		});

		bench('isEmpty', () => {
			evalFn(workflow, EXTENSION_CALL[1], smallData);
		});
	});

	describe('Array Iteration', () => {
		bench('map 100 items', () => {
			evalFn(workflow, ARRAY_ITERATION[0], mediumData);
		});

		bench('filter 100 items', () => {
			evalFn(workflow, ARRAY_ITERATION[1], mediumData);
		});

		bench('filter+map 100 items', () => {
			evalFn(workflow, ARRAY_ITERATION[2], mediumData);
		});

		bench('map 10k items', () => {
			evalFn(workflow, ARRAY_ITERATION[0], largeData);
		});
	});

	describe('Conditional', () => {
		bench('nullish coalescing', () => {
			evalFn(workflow, CONDITIONAL[0], smallData);
		});

		bench('ternary', () => {
			evalFn(workflow, CONDITIONAL[1], smallData);
		});
	});
}
