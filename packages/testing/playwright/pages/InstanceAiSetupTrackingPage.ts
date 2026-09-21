import { expect, type Page } from '@playwright/test';
import type {
	InstanceAiMessage,
	InstanceAiSetupItem,
	InstanceAiWorkflowSetupNode,
} from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

import { BasePage } from './BasePage';

export class InstanceAiSetupTrackingPage extends BasePage {
	readonly events: Array<{ name: string; properties: Record<string, unknown> }> = [];

	constructor(page: Page) {
		super(page);
	}

	async captureTelemetry() {
		await this.page.exposeFunction(
			'captureSetupTelemetry',
			(name: string, properties: Record<string, unknown>) => {
				this.events.push({ name, properties });
			},
		);
		await this.page.addInitScript(() => {
			Object.defineProperty(window, 'rudderanalytics', {
				value: {
					track: (name: string, properties: Record<string, unknown>) => {
						Reflect.get(window, 'captureSetupTelemetry')(name, properties);
					},
					identify() {},
					page() {},
					group() {},
					reset() {},
					ready(onReady: () => void) {
						onReady();
					},
				},
				configurable: true,
			});
		});
	}

	async openFixture(options: {
		threadId: string;
		projectId: string;
		workflow: IWorkflowBase;
		asyncSetup: boolean;
		requests: InstanceAiWorkflowSetupNode[];
	}) {
		const { threadId, projectId, workflow, asyncSetup, requests } = options;
		const requestId = `setup-${threadId}`;
		const setupItems: InstanceAiSetupItem[] = requests.flatMap((request) => [
			...(request.credentialType
				? [
						{
							id: `${workflow.id}:credential:${request.credentialType}:${request.node.name}`,
							kind: 'credential' as const,
							credentialType: request.credentialType,
							nodeBindings: [{ nodeName: request.node.name }],
						},
					]
				: []),
			{
				id: `${workflow.id}:parameters:${request.node.name}`,
				kind: 'parameters' as const,
				nodeName: request.node.name,
				parameterNames: Object.keys(request.parameterIssues ?? {}),
			},
		]);
		const message: InstanceAiMessage = {
			id: `message-${threadId}`,
			runId: `run-${threadId}`,
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: 'The workflow is ready for setup.',
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: `agent-${threadId}`,
				role: 'orchestrator',
				status: 'completed',
				textContent: 'The workflow is ready for setup.',
				reasoning: '',
				children: [],
				timeline: asyncSetup ? [] : [{ type: 'tool-call', toolCallId: 'setup-call' }],
				toolCalls: asyncSetup
					? []
					: [
							{
								toolCallId: 'setup-call',
								toolName: 'workflows',
								args: { action: 'setup', workflowId: workflow.id },
								isLoading: true,
								confirmationStatus: 'pending',
								confirmation: {
									requestId,
									inputType: 'approval',
									severity: 'info',
									message: 'Set up the workflow',
									workflowId: workflow.id,
									projectId,
									setupRequests: requests,
								},
							},
						],
				setupItemsByWorkflowId: { [workflow.id]: setupItems },
				latestSetupAnnouncement: {
					workflowId: workflow.id,
					agentId: `agent-${threadId}`,
					timestamp: new Date().toISOString(),
				},
			},
		};
		await this.page.route('**/rest/module-settings', async (route) => {
			const response = await route.fetch();
			const body = await response.json();
			body.data['instance-ai'].setupCompleted = true;
			await route.fulfill({ response, json: body });
		});
		await this.page.route(`**/rest/instance-ai/threads/${threadId}/messages*`, async (route) => {
			await route.fulfill({ json: { data: { threadId, projectId, messages: [message] } } });
		});
		await this.page.route(`**/rest/instance-ai/confirm/${requestId}`, async (route) => {
			const payload = route.request().postDataJSON();
			const response = await this.page.request.get(`/rest/workflows/${workflow.id}`);
			const saved = (await response.json()).data;
			for (const node of saved.nodes) {
				node.parameters = { ...node.parameters, ...payload.nodeParameters?.[node.name] };
				for (const [type, id] of Object.entries(payload.nodeCredentials?.[node.name] ?? {})) {
					node.credentials ??= {};
					node.credentials[type] = { id, name: 'Setup test credential' };
				}
			}
			const updated = await this.page.request.patch(`/rest/workflows/${workflow.id}`, {
				data: { nodes: saved.nodes, versionId: saved.versionId, expectedChecksum: saved.checksum },
			});
			expect(updated.ok()).toBe(true);
			await route.fulfill({ json: { data: { success: true } } });
		});
		await this.page.route(`**/rest/instance-ai/chat/${threadId}`, async (route) => {
			await route.fulfill({ status: 409, json: { message: 'Test send attempt' } });
		});
		await this.goto(threadId);
	}

	async goto(threadId: string) {
		await this.page.goto(`/assistant/${threadId}`);
		await expect(this.page.getByRole('button', { name: 'Chat history' })).toBeVisible();
	}

	get panel() {
		return this.page.getByTestId('instance-ai-setup-panel');
	}
	get row() {
		return this.panel.getByTestId('setup-panel-row').first();
	}
	get parameter() {
		return this.page.getByTestId('parameter-input-url').getByRole('textbox');
	}
	get confirm() {
		return this.panel.getByTestId('instance-ai-setup-panel-confirm');
	}
	get execute() {
		return this.panel.getByRole('button', { name: 'Execute', exact: true });
	}

	async selectCredential(id: string) {
		await this.page.getByRole('combobox').filter({ visible: true }).first().click();
		await this.page.getByTestId(`node-credentials-select-item-${id}`).click();
	}

	async openNewCredential() {
		await this.page.getByRole('combobox').filter({ visible: true }).first().click();
		await this.page.getByTestId('node-credentials-select-item-new').click();
	}
}
