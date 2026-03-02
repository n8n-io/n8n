/**
 * Tier 1: Real Expression Pattern Benchmarks
 *
 * Benchmarks expression evaluation through the full Workflow.expression path
 * with both engines (current Tournament vs vm isolated-vm).
 *
 * Pattern distribution based on 9,035 production workflows (78,517 expressions).
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { bench, describe, beforeAll, afterAll } from 'vitest';

import {
	createWorkflow,
	evaluate,
	makeSmallData,
	makeMediumData,
	makeLargeData,
	useCurrentEngine,
	useVmEngine,
} from './fixtures/data';
import {
	SIMPLE_PROPERTY,
	NESTED_PROPERTY,
	EXTENSION_CALL,
	ARRAY_ITERATION,
	CONDITIONAL,
} from './fixtures/expressions';

// Shared state
const workflow = createWorkflow();
const smallData = makeSmallData();
const mediumData = makeMediumData();
const largeData = makeLargeData();

// ── Current Engine ──

describe('current', () => {
	beforeAll(async () => {
		await useCurrentEngine();
	});

	describe('Simple Property', () => {
		bench('small data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], smallData);
		});

		bench('medium data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], mediumData);
		});

		bench('large data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], largeData);
		});
	});

	describe('Nested Property', () => {
		bench('depth 3', () => {
			evaluate(workflow, NESTED_PROPERTY[0], smallData);
		});

		bench('depth 4', () => {
			evaluate(workflow, NESTED_PROPERTY[1], smallData);
		});
	});

	describe('Extension Call', () => {
		bench('toUpperCase', () => {
			evaluate(workflow, EXTENSION_CALL[0], smallData);
		});

		bench('isEmpty', () => {
			evaluate(workflow, EXTENSION_CALL[1], smallData);
		});
	});

	describe('Array Iteration', () => {
		bench('map 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[0], mediumData);
		});

		bench('filter 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[1], mediumData);
		});

		bench('filter+map 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[2], mediumData);
		});

		bench('map 10k items', () => {
			evaluate(workflow, ARRAY_ITERATION[0], largeData);
		});
	});

	describe('Conditional', () => {
		bench('nullish coalescing', () => {
			evaluate(workflow, CONDITIONAL[0], smallData);
		});

		bench('ternary', () => {
			evaluate(workflow, CONDITIONAL[1], smallData);
		});
	});
});

// ── VM Engine ──

describe('vm', () => {
	beforeAll(async () => {
		await useVmEngine();
	});

	afterAll(async () => {
		await useCurrentEngine();
	});

	describe('Simple Property', () => {
		bench('small data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], smallData);
		});

		bench('medium data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], mediumData);
		});

		bench('large data', () => {
			evaluate(workflow, SIMPLE_PROPERTY[0], largeData);
		});
	});

	describe('Nested Property', () => {
		bench('depth 3', () => {
			evaluate(workflow, NESTED_PROPERTY[0], smallData);
		});

		bench('depth 4', () => {
			evaluate(workflow, NESTED_PROPERTY[1], smallData);
		});
	});

	describe('Extension Call', () => {
		bench('toUpperCase', () => {
			evaluate(workflow, EXTENSION_CALL[0], smallData);
		});

		bench('isEmpty', () => {
			evaluate(workflow, EXTENSION_CALL[1], smallData);
		});
	});

	describe('Array Iteration', () => {
		bench('map 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[0], mediumData);
		});

		bench('filter 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[1], mediumData);
		});

		bench('filter+map 100 items', () => {
			evaluate(workflow, ARRAY_ITERATION[2], mediumData);
		});

		bench('map 10k items', () => {
			evaluate(workflow, ARRAY_ITERATION[0], largeData);
		});
	});

	describe('Conditional', () => {
		bench('nullish coalescing', () => {
			evaluate(workflow, CONDITIONAL[0], smallData);
		});

		bench('ternary', () => {
			evaluate(workflow, CONDITIONAL[1], smallData);
		});
	});
});
