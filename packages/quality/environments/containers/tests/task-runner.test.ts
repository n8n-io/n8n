import { describe, expect, test } from 'vitest';

import { engineTaskRunner } from '../services/engine-task-runner';
import { taskRunner } from '../services/task-runner';
import type { StartContext } from '../services/types';

const context = (
	topology: { mains: number; workers: number } = { mains: 1, workers: 0 },
	env?: Record<string, string>,
) =>
	({
		...topology,
		isQueueMode: topology.mains > 1 || topology.workers > 0,
		projectName: 'proj',
		external: false,
		config: { env },
	}) as unknown as StartContext;

describe('task runner service', () => {
	test('starts for a stack that keeps the default external runners', () => {
		expect(taskRunner.shouldStart?.(context())).toBe(true);
		expect(taskRunner.shouldStart?.(context(undefined, { N8N_RUNNERS_MODE: 'external' }))).toBe(
			true,
		);
	});

	test('stays off for a stack that runs internal runners', () => {
		expect(taskRunner.shouldStart?.(context(undefined, { N8N_RUNNERS_MODE: 'internal' }))).toBe(
			false,
		);
	});

	test('starts for a worker, which runs the task broker in queue mode', () => {
		expect(taskRunner.shouldStart?.(context({ mains: 2, workers: 1 }))).toBe(true);
	});

	test('stays off for more than one main without a worker, since no process runs a task broker', () => {
		expect(taskRunner.shouldStart?.(context({ mains: 2, workers: 0 }))).toBe(false);
	});

	test.each([
		[{ mains: 1, workers: 0 }, 'http://proj-n8n:5679'],
		[{ mains: 2, workers: 1 }, 'http://proj-n8n-worker-1:5679'],
	])('dials the task broker of %o at %s', (topology, taskBrokerUri) => {
		expect(taskRunner.getOptions?.(context(topology))).toEqual({ taskBrokerUri });
	});
});

describe('engine task runner service', () => {
	test.each([
		[false, 'http://proj-n8n-engine:5679'],
		[true, 'http://proj-n8n-engine-step-worker:5679'],
	])(
		'dials the task broker of the engine container that runs steps: split roles %s, broker %s',
		(splitEngineRoles, taskBrokerUri) => {
			const ctx = {
				projectName: 'proj',
				config: { engine: 'container', splitEngineRoles },
			} as unknown as StartContext;

			expect(engineTaskRunner.getOptions?.(ctx)).toEqual({ taskBrokerUri });
		},
	);
});
