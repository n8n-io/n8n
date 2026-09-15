import { describe, expect, test, vi } from 'vitest';

import type { ApiHelpers } from './api-helper';
import { WorkflowApiHelper } from './workflow-api-helper';

function apiWith(options: ApiHelpers['options']) {
	const post = vi.fn().mockResolvedValue({
		ok: () => true,
		json: async () => ({ data: { id: 'wf-1', versionId: 'v-1' } }),
	});
	const api = { request: { post }, options } as unknown as ApiHelpers;
	return { api, post };
}

function postedSettings(post: ReturnType<typeof vi.fn>) {
	const [, { data }] = post.mock.calls[0] as [string, { data: { settings?: unknown } }];
	return data.settings;
}

describe('WorkflowApiHelper workflow settings defaults', () => {
	test('leaves a workflow without settings untouched when there are no defaults', async () => {
		const { api, post } = apiWith({});

		await new WorkflowApiHelper(api).createWorkflow({ name: 'wf' });

		expect(postedSettings(post)).toBeUndefined();
	});

	test('applies the defaults to a created workflow', async () => {
		const { api, post } = apiWith({ workflowSettings: { engineType: 'v2' } });

		await new WorkflowApiHelper(api).createWorkflow({ name: 'wf' });

		expect(postedSettings(post)).toEqual({ engineType: 'v2' });
	});

	test('lets the defaults win over the settings in the definition', async () => {
		const { api, post } = apiWith({ workflowSettings: { engineType: 'v2' } });

		await new WorkflowApiHelper(api).createWorkflow({
			name: 'wf',
			settings: { executionOrder: 'v1', engineType: 'v1' },
		});

		expect(postedSettings(post)).toEqual({ executionOrder: 'v1', engineType: 'v2' });
	});

	test('applies the defaults to a workflow created in a project', async () => {
		const { api, post } = apiWith({ workflowSettings: { engineType: 'v2' } });

		await new WorkflowApiHelper(api).createInProject('project-1');

		expect(postedSettings(post)).toEqual({ engineType: 'v2' });
	});
});

describe('WorkflowApiHelper.waitForExecutionById', () => {
	function apiReturning(statuses: string[]) {
		const get = vi.fn();
		for (const status of statuses) {
			get.mockResolvedValueOnce({
				ok: () => true,
				json: async () => ({ data: { id: 'exec-1', status } }),
			});
		}
		return { api: { request: { get }, options: {} } as unknown as ApiHelpers, get };
	}

	test('returns the execution once it reaches a settled status', async () => {
		const { api, get } = apiReturning(['running', 'running', 'success']);

		const execution = await new WorkflowApiHelper(api).waitForExecutionById('exec-1', 2000, 0);

		expect(execution.status).toBe('success');
		expect(get).toHaveBeenCalledTimes(3);
	});

	test('returns a failed execution instead of waiting for success', async () => {
		const { api } = apiReturning(['error']);

		const execution = await new WorkflowApiHelper(api).waitForExecutionById('exec-1', 2000, 0);

		expect(execution.status).toBe('error');
	});

	test('throws when the execution does not settle in time', async () => {
		const { api } = apiReturning(Array(50).fill('running'));

		await expect(new WorkflowApiHelper(api).waitForExecutionById('exec-1', 20, 5)).rejects.toThrow(
			/did not settle/,
		);
	});
});
