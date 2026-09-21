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

		expect(post).toHaveBeenCalledWith('/rest/workflows', expect.anything());
		expect(postedSettings(post)).toEqual({ engineType: 'v2' });
	});

	test('puts a created workflow in the project the caller names', async () => {
		const { api, post } = apiWith({});

		await new WorkflowApiHelper(api).createWorkflow({ name: 'wf' }, 'project-1');

		const [, { data }] = post.mock.calls[0] as [string, { data: unknown }];
		expect(data).toMatchObject({ name: 'wf', projectId: 'project-1' });
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

describe('WorkflowApiHelper.runManually engine routing', () => {
	function apiReturningExecutionId(executionId: string, options: ApiHelpers['options']) {
		const post = vi.fn().mockResolvedValue({
			ok: () => true,
			json: async () => ({ data: { executionId } }),
		});
		return { api: { request: { post }, options } as unknown as ApiHelpers };
	}

	test('accepts the engine 2.0 execution id a routed run mints', async () => {
		const id = '0199c3a1-8f4e-7c2b-9a1d-2f6b8e4c1a77';
		const { api } = apiReturningExecutionId(id, { workflowSettings: { engineType: 'v2' } });

		await expect(new WorkflowApiHelper(api).runManually('wf-1', 'Trigger')).resolves.toEqual({
			executionId: id,
		});
	});

	test('rejects a legacy execution id when the stack routes to engine 2.0', async () => {
		const { api } = apiReturningExecutionId('1783', { workflowSettings: { engineType: 'v2' } });

		// The guidance half of the message is part of the contract, so match it too.
		await expect(new WorkflowApiHelper(api).runManually('wf-1', 'Trigger')).rejects.toThrow(
			/1783[\s\S]*settings\.engineType[\s\S]*api\.workflows/,
		);
	});

	test('accepts a legacy execution id on a stack without engine 2.0', async () => {
		const { api } = apiReturningExecutionId('1783', {});

		await expect(new WorkflowApiHelper(api).runManually('wf-1', 'Trigger')).resolves.toEqual({
			executionId: '1783',
		});
	});
});

describe('WorkflowApiHelper.assertLatestExecutionRoutedToEngine', () => {
	function apiListing(executionIds: string[], options: ApiHelpers['options']) {
		const get = vi.fn().mockResolvedValue({
			ok: () => true,
			json: async () => ({ data: { results: executionIds.map((id) => ({ id })) } }),
		});
		return { api: { request: { get }, options } as unknown as ApiHelpers, get };
	}

	test('rejects a legacy id on the latest execution when the stack routes to engine 2.0', async () => {
		const { api } = apiListing(['1783'], { workflowSettings: { engineType: 'v2' } });

		await expect(
			new WorkflowApiHelper(api).assertLatestExecutionRoutedToEngine('wf-1'),
		).rejects.toThrow(/1783[\s\S]*settings\.engineType/);
	});

	test('throws when the workflow has no execution to check', async () => {
		const { api } = apiListing([], { workflowSettings: { engineType: 'v2' } });

		await expect(
			new WorkflowApiHelper(api).assertLatestExecutionRoutedToEngine('wf-1'),
		).rejects.toThrow(/wf-1[\s\S]*no execution/);
	});

	test('does not read executions on a stack without engine 2.0', async () => {
		const { api, get } = apiListing(['1783'], {});

		await new WorkflowApiHelper(api).assertLatestExecutionRoutedToEngine('wf-1');

		expect(get).not.toHaveBeenCalled();
	});
});
