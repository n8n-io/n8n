import { workflow, trigger, node } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { HookRegistryServer } from '../../../services/hook-registry-server';

/**
 * E2E for declarative webhook triggers (`description.trigger: { type: 'webhook' }`):
 * activation must register the webhook with the vendor (the hook registry),
 * matching deliveries must run the workflow, filtered deliveries must not, and
 * deactivation must deregister.
 *
 * The registry runs on the test host. The n8n under test reaches it via
 * HOOK_REGISTRY_PUBLIC_HOST (default `localhost`; set `host.docker.internal`
 * when n8n runs inside a container without host networking).
 */
const REGISTRY_PUBLIC_HOST = process.env.HOOK_REGISTRY_PUBLIC_HOST ?? 'localhost';

const makeDeclarativeWebhookWorkflow = (registryUrl: string) => {
	const webhookTrigger = trigger({
		type: 'n8n-nodes-base.e2eTestDeclarativeWebhookTrigger',
		version: 1,
		config: {
			name: 'Declarative Webhook Trigger',
			parameters: { url: registryUrl, events: ['created'] },
		},
	});

	const noOp = node({
		type: 'n8n-nodes-base.noOp',
		version: 1,
		config: { name: 'NoOp' },
	});

	return workflow(nanoid(), `Declarative Webhook Trigger Test ${nanoid()}`).add(
		webhookTrigger.to(noOp),
	);
};

test.describe(
	'Declarative Webhook Trigger',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		let registry: HookRegistryServer;

		test.beforeAll(async () => {
			registry = await new HookRegistryServer().start();
		});

		test.afterAll(async () => {
			await registry.stop();
		});

		test('registers on activation, runs only matching deliveries, deregisters on deactivation', async ({
			api,
		}) => {
			const registryUrl = `http://${REGISTRY_PUBLIC_HOST}:${registry.port}`;

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				makeDeclarativeWebhookWorkflow(registryUrl).toJSON() as never,
			);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);

			// Activation registered exactly one hook, carrying the selected events.
			expect(registry.hooks.size).toBe(1);
			const [hook] = [...registry.hooks.values()];
			expect(hook.target_url).toContain('/webhook');
			expect(hook.events).toEqual(['created']);

			// A filtered delivery is answered 200 but must not start a run; the
			// matching delivery afterwards is the synchronization point proving it.
			const filtered = await registry.fire({ event: 'deleted', note: 'must not run' });
			expect(filtered.statuses).toEqual([200]);

			// A delivery with a bad signature is rejected outright.
			const tampered = await registry.fireWithSignature(
				hook.target_url,
				{ event: 'created', note: 'forged, must not run' },
				'sha256=deadbeef',
			);
			expect(tampered.status).toBe(401);

			await registry.fire({ event: 'created', note: 'must run' });
			const execution = await api.workflows.waitForExecution(workflowId, 30_000, 'webhook');
			expect(execution.status).toBe('success');

			const executions = await api.workflows.getExecutions(workflowId, 50);
			expect(executions.filter((e) => e.mode === 'webhook')).toHaveLength(1);

			await api.workflows.deactivate(workflowId);
			expect(registry.hooks.size).toBe(0);
		});
	},
);
