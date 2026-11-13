import { workflow, trigger, node } from '@n8n/workflow-sdk';
import flatted from 'flatted';
import { nanoid } from 'nanoid';
import type { ProxyServer } from 'n8n-containers/services/proxy';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import { readNodeStaticData } from '../scheduling/poll-trigger-helpers';

const TRIGGER_NODE_NAME = 'E2E Test Declarative Webhook Trigger';

// MockServer plays the hook registry. n8n reaches it through HTTP_PROXY.
test.use({ capability: { services: ['proxy'] } });

const makeWorkflow = (registryUrl: string) =>
	workflow(nanoid(), `Declarative Webhook Trigger Test ${nanoid()}`).add(
		trigger({
			type: 'n8n-nodes-base.e2eTestDeclarativeWebhookTrigger',
			version: 1,
			config: {
				name: TRIGGER_NODE_NAME,
				parameters: { url: registryUrl, events: ['created'] },
			},
		}).to(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'NoOp' } })),
	);

async function mockRegistryRoute(proxy: ProxyServer, method: string, path: string, body: unknown) {
	await proxy.createExpectation({
		httpRequest: { method, path },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify(body),
		},
	});
}

const readTriggerStaticData = async (api: ApiHelpers, workflowId: string) =>
	(await readNodeStaticData(api, workflowId, TRIGGER_NODE_NAME)) ?? {};

test.describe(
	'Declarative Webhook Trigger',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('should register the hook on activation, run on delivery, and remove the hook on deactivation', async ({
			api,
			services,
		}) => {
			const base = `/${nanoid()}`;
			await mockRegistryRoute(services.proxy, 'GET', `${base}/hooks`, { hooks: [] });
			await mockRegistryRoute(services.proxy, 'POST', `${base}/hooks`, { id: 'h1' });
			await mockRegistryRoute(services.proxy, 'DELETE', `${base}/hooks/h1`, {});

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				makeWorkflow(`http://e2e-hook-registry.local${base}`).toJSON() as IWorkflowBase,
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// checkExists finds no hook, so create registers one and stores its ID.
			await expect
				.poll(async () => await readTriggerStaticData(api, workflowId))
				.toEqual({ webhookId: 'h1' });
			expect(await services.proxy.wasRequestMade({ method: 'GET', path: `${base}/hooks` })).toBe(
				true,
			);
			const [registration] = (await services.proxy.getReceivedRequests(`${base}/hooks`)).filter(
				(request) => request.method === 'POST',
			);
			const hook = registration.body as { target_url: string; events: string[] };
			expect(hook.events).toEqual(['created']);

			const delivery = await api.webhooks.trigger(new URL(hook.target_url).pathname, {
				method: 'POST',
				data: { event: 'created', id: 1 },
			});
			expect(delivery.status()).toBe(200);

			const execution = await api.workflows.waitForExecution(workflowId, 30_000, 'webhook');
			expect(execution.status).toBe('success');
			const { data } = await api.workflows.getExecution(execution.id, {
				redactExecutionData: false,
			});
			const runData = (flatted.parse(data) as IRunExecutionData).resultData.runData;
			expect(runData[TRIGGER_NODE_NAME][0].data?.main[0]?.map((item) => item.json)).toEqual([
				{ event: 'created', id: 1 },
			]);

			await api.workflows.deactivate(workflowId);

			await expect
				.poll(
					async () =>
						await services.proxy.wasRequestMade({ method: 'DELETE', path: `${base}/hooks/h1` }),
				)
				.toBe(true);
			await expect.poll(async () => await readTriggerStaticData(api, workflowId)).toEqual({});
		});
	},
);
