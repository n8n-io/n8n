import flatted from 'flatted';
import type { ProxyServer } from 'n8n-containers/services/proxy';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Manual -> Capture Resume URL -> Slow (HTTP Request to MockServer) -> Wait (resume on webhook call) -> After
const WORKFLOW_FILE = 'wait-webhook-early-resume.json';
const SLOW_PATH = '/engine-v2-slow';

test.use({ capability: 'proxy' });

async function delaySlowNode(proxy: ProxyServer, ms: number) {
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path: SLOW_PATH },
		httpResponse: { statusCode: 200, body: '{}', delay: { timeUnit: 'MILLISECONDS', value: ms } },
	});
}

/**
 * Starts the workflow and returns the resume URL as soon as the run exposes it,
 * while the Slow node still holds the run before the Wait node.
 */
async function startAndReadResumeUrl(api: ApiHelpers, workflowId: string) {
	const { executionId } = await api.workflows.runManually(workflowId, 'Manual');

	let resumePath: string | undefined;
	await expect
		.poll(
			async () => {
				const { data } = await api.workflows.getExecution(executionId);
				// Engine v1 stores node data of a running execution only with `saveExecutionProgress`,
				// and engine v2 lists a running node before it has output.
				const capture = data
					? flatted.parse(data)?.resultData?.runData?.['Capture Resume URL']
					: undefined;
				const resumeUrl: string | undefined = capture?.[0]?.data?.main?.[0]?.[0]?.json?.resumeUrl;
				if (!resumeUrl) return false;
				const url = new URL(resumeUrl);
				resumePath = `${url.pathname}${url.search}`;
				return true;
			},
			{ intervals: [100] },
		)
		.toBe(true);

	return { executionId, resumePath: resumePath! };
}

test.describe(
	'Wait node early resume request',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.beforeEach(async ({ services }) => {
			await services.proxy.clearAllExpectations();
		});

		test('should hold a resume request that arrives just before the wait and then resume @engine:v2', async ({
			api,
			services,
			n8nStackConfig,
		}) => {
			test.skip(
				!n8nStackConfig.engine,
				'Engine v1 refuses a request for a running execution at once',
			);
			// Passes only while DEFAULT_RESUME_HOLD in @n8n/engine (about 1 s) outlasts this delay.
			await delaySlowNode(services.proxy, 600);
			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);
			const { executionId, resumePath } = await startAndReadResumeUrl(api, workflowId);
			expect((await api.workflows.getExecution(executionId)).status).toBe('running');

			const response = await api.webhooks.trigger(resumePath, { maxNotFoundRetries: 0 });

			expect(response.status()).toBe(200);
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');
			expect(flatted.parse(execution.data).resultData.runData.After).toHaveLength(1);
		});

		test('should refuse a resume request that arrives long before the wait @engine:v2', async ({
			api,
			services,
		}) => {
			// Longer than the 1 s hold.
			await delaySlowNode(services.proxy, 2500);
			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);
			const { executionId, resumePath } = await startAndReadResumeUrl(api, workflowId);

			const early = await api.webhooks.trigger(resumePath, { maxNotFoundRetries: 0 });
			expect(early.status()).toBe(409);

			// The refusal changes nothing: the same URL resumes the wait once it starts.
			await api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10_000);
			const late = await api.webhooks.trigger(resumePath, { maxNotFoundRetries: 0 });
			expect(late.status()).toBe(200);
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');
		});
	},
);
