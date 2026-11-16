import { describe, expect, test } from 'vitest';

import { taskRunner } from '../services/task-runner';
import type { StartContext } from '../services/types';

describe('task runner service', () => {
	const context = (env?: Record<string, string>) =>
		({ config: { env }, mains: 1, workers: 0 }) as StartContext;

	test('starts for a stack that keeps the default external runners', () => {
		expect(taskRunner.shouldStart?.(context())).toBe(true);
		expect(taskRunner.shouldStart?.(context({ N8N_RUNNERS_MODE: 'external' }))).toBe(true);
	});

	test('stays off for a stack that runs internal runners', () => {
		expect(taskRunner.shouldStart?.(context({ N8N_RUNNERS_MODE: 'internal' }))).toBe(false);
	});
});
