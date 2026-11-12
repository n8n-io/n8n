import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { N8NStack } from 'n8n-containers/stack';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { PROXY_WITHOUT_COMMUNITY_PACKAGES } from '../../../fixtures/capabilities';

test.use({
	capability: {
		...PROXY_WITHOUT_COMMUNITY_PACKAGES,
		env: { ...PROXY_WITHOUT_COMMUNITY_PACKAGES.env, N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '60' },
	},
});

const TOOL_DELAY_SECONDS = 5;

const WEBHOOK_DELAY_SECONDS = 12;

const STOP_TIMEOUT_MS = 90_000;

const slowToolWorkflow = (toolUrl: string): Partial<IWorkflowBase> => ({
	name: 'MCP graceful shutdown',
	nodes: [
		{
			id: 'mcp-trigger',
			name: 'MCP Server Trigger',
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			typeVersion: 2.1,
			position: [0, 0],
			parameters: { authentication: 'none', path: 'mcp-shutdown' },
		},
		{
			id: 'slow-tool',
			name: 'slow_tool',
			type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
			typeVersion: 1.1,
			position: [200, 200],
			parameters: { toolDescription: 'Waits for a slow endpoint', url: toolUrl },
		},
	],
	connections: {
		slow_tool: { ai_tool: [[{ node: 'MCP Server Trigger', type: 'ai_tool', index: 0 }]] },
	},
});

const slowWebhookWorkflow = (url: string): Partial<IWorkflowBase> => ({
	name: 'Webhook graceful shutdown',
	nodes: [
		{
			id: 'webhook',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { httpMethod: 'POST', path: 'shutdown', responseMode: 'lastNode', options: {} },
		},
		{
			id: 'slow-request',
			name: 'Slow Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.2,
			position: [220, 0],
			parameters: { url, options: {} },
		},
	],
	connections: { Webhook: { main: [[{ node: 'Slow Request', type: 'main', index: 0 }]] } },
});

async function delayResponse(
	proxy: ServiceHelpers['proxy'],
	path: string,
	seconds: number,
	answer: string,
) {
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({ answer }),
			delay: { timeUnit: 'SECONDS', value: seconds },
		},
	});
}

async function followLogs(container: ReturnType<N8NStack['findContainers']>[number]) {
	const stream = await container.logs();
	let output = '';
	stream.on('data', (chunk: Buffer | string) => {
		output += chunk.toString();
	});
	return () => output;
}

test.describe(
	'Main graceful shutdown @mode:queue',
	{
		annotation: [{ type: 'owner', description: 'Core Execution' }],
	},
	() => {
		test('should finish work in flight and refuse new requests while it drains', async ({
			api,
			services,
			n8nContainer,
		}) => {
			const toolPath = `/slow-tool-${nanoid()}`;
			const webhookTargetPath = `/slow-webhook-${nanoid()}`;
			await delayResponse(services.proxy, toolPath, TOOL_DELAY_SECONDS, 'slow tool finished');
			await delayResponse(
				services.proxy,
				webhookTargetPath,
				WEBHOOK_DELAY_SECONDS,
				'slow webhook finished',
			);

			const mcp = await api.workflows.createWorkflowFromDefinition(
				slowToolWorkflow(`http://slow-tool.test${toolPath}`),
			);
			await api.workflows.activate(mcp.workflowId, mcp.createdWorkflow.versionId!);
			const mcpNode = mcp.createdWorkflow.nodes?.find((node) => node.type.includes('mcpTrigger'));
			const mcpPath = `mcp/${mcpNode?.parameters.path as string}`;

			const webhook = await api.workflows.createWorkflowFromDefinition(
				slowWebhookWorkflow(`http://slow-webhook.test${webhookTargetPath}`),
				{ webhookPrefix: 'shutdown' },
			);
			await api.workflows.activate(webhook.workflowId, webhook.createdWorkflow.versionId!);

			const slowWebhook = api.webhooks.trigger(`webhook/${webhook.webhookPath}`, {
				method: 'POST',
				maxNotFoundRetries: 20,
			});
			const session = await api.mcp.sseSetup(mcpPath);
			const toolCall = api.mcp.callTool(session, mcpPath, 'slow_tool', {});
			await expect
				.poll(
					async () =>
						(await services.proxy.getReceivedRequests(toolPath)).length +
						(await services.proxy.getReceivedRequests(webhookTargetPath)).length,
					{ timeout: 30_000 },
				)
				.toBe(2);

			const [main] = n8nContainer.findContainers(/-n8n$/);
			const mainLogs = await followLogs(main);
			const stopRequestedAt = Date.now();
			const stopped = main.stop({ timeout: STOP_TIMEOUT_MS });

			await expect
				.poll(async () => await api.isHealthy().catch(() => false), { timeout: 6_000 })
				.toBe(false);
			await expect(api.mcp.sseSetup(mcpPath, { maxNotFoundRetries: 0 })).rejects.toThrow();

			const result = await toolCall;
			expect(result.isError).toBeFalsy();
			expect(result.content[0].text).toContain('slow tool finished');

			const webhookResponse = await slowWebhook;
			expect(webhookResponse.ok()).toBe(true);
			expect(await webhookResponse.text()).toContain('slow webhook finished');

			await stopped;
			expect(Date.now() - stopRequestedAt).toBeLessThan(STOP_TIMEOUT_MS);
			expect(mainLogs()).not.toContain('Connection is closed');
			expect(mainLogs()).not.toContain('Shutdown timed out');

			await n8nContainer.replaceN8N({ image: TEST_CONTAINER_IMAGES.n8n });
			for (const workflowId of [mcp.workflowId, webhook.workflowId]) {
				const executions = await api.workflows.getExecutions(workflowId);
				expect(executions.length).toBeGreaterThan(0);
				expect(executions.map((execution) => execution.status)).not.toContain('error');
			}
		});
	},
);
