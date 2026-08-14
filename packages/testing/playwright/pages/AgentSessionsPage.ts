import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './BasePage';

interface ToolCallMock {
	name: string;
	input: Record<string, unknown>;
	output: Record<string, unknown>;
}

interface WorkflowToolCallMock {
	name: string;
	workflowId: string;
	executionId: string;
}

interface AgentSessionMock {
	projectId: string;
	agentId: string;
	threadId: string;
	sessionTitle?: string;
	nodeTool: ToolCallMock;
	workflowTool: WorkflowToolCallMock;
}

interface ElementWidth {
	clientWidth: number;
	scrollWidth: number;
}

export class AgentSessionsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async mockSession({
		projectId,
		agentId,
		threadId,
		sessionTitle = 'Tool input and output',
		nodeTool,
		workflowTool,
	}: AgentSessionMock): Promise<void> {
		const createdAt = '2026-01-01T12:00:00.000Z';
		const stoppedAt = '2026-01-01T12:00:03.000Z';
		const startedAtMs = Date.parse(createdAt);
		const thread = {
			id: threadId,
			agentId,
			agentName: 'Agent session E2E',
			parentThreadId: null,
			parentAgentId: null,
			projectId,
			taskId: null,
			sessionNumber: 1,
			title: sessionTitle,
			emoji: null,
			totalPromptTokens: 10,
			totalCompletionTokens: 5,
			totalCost: 0,
			totalDuration: 3_000,
			createdAt,
			updatedAt: stoppedAt,
			firstMessage: null,
			source: 'chat',
		};
		const execution = {
			id: 'agent-execution-e2e',
			threadId,
			agentId,
			status: 'success',
			createdAt,
			startedAt: createdAt,
			stoppedAt,
			duration: 3_000,
			userMessage: null,
			attachments: null,
			model: null,
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			cost: 0,
			timeline: [
				{
					type: 'tool-call',
					kind: 'node',
					name: nodeTool.name,
					toolCallId: 'node-tool-call-e2e',
					input: nodeTool.input,
					output: nodeTool.output,
					startTime: startedAtMs + 500,
					endTime: startedAtMs + 1_000,
					success: true,
					nodeType: 'n8n-nodes-base.set',
					nodeTypeVersion: 3.4,
					nodeDisplayName: nodeTool.name,
					nodeParameters: nodeTool.input,
				},
				{
					type: 'tool-call',
					kind: 'workflow',
					name: workflowTool.name,
					toolCallId: 'workflow-tool-call-e2e',
					input: {},
					output: { executionId: workflowTool.executionId, status: 'success' },
					startTime: startedAtMs + 1_500,
					endTime: startedAtMs + 2_500,
					success: true,
					workflowId: workflowTool.workflowId,
					workflowName: workflowTool.name,
					workflowExecutionId: workflowTool.executionId,
					triggerType: 'executeWorkflow',
				},
			],
			error: null,
			hitlStatus: null,
			source: 'chat',
		};
		const threadsPath = `/rest/projects/${projectId}/agents/v2/${agentId}/threads`;

		await this.page.route(
			(url) => url.pathname === threadsPath,
			async (route) => {
				await route.fulfill({ json: { data: { threads: [thread], nextCursor: null } } });
			},
		);
		await this.page.route(
			(url) => url.pathname === `${threadsPath}/${threadId}`,
			async (route) => {
				await route.fulfill({ json: { data: { thread, executions: [execution] } } });
			},
		);
	}

	async goto(projectId: string, agentId: string, threadId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}/sessions/${threadId}`);
		await expect(this.getTimelineRows().first()).toBeVisible();
	}

	async gotoList(projectId: string, agentId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}/sessions`);
		await expect(this.getSessionTitle()).toBeVisible();
	}

	async setViewportWidth(width: number): Promise<void> {
		await this.page.setViewportSize({
			width,
			height: this.page.viewportSize()?.height ?? 720,
		});
	}

	async getSessionTableWidth(): Promise<ElementWidth> {
		return await this.page.getByTestId('table-base-scroll').evaluate((element) => ({
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
		}));
	}

	async getSessionTitleWidth(): Promise<ElementWidth> {
		return await this.getSessionTitle().evaluate((element) => ({
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
		}));
	}

	getSessionTitle(): Locator {
		return this.page.getByTestId('agent-session-title');
	}

	getTimelineRows(): Locator {
		return this.page.getByTestId('timeline-row');
	}

	async openTimelineItem(name: string): Promise<void> {
		await this.getTimelineRows().filter({ hasText: name }).click();
	}

	getInputRunData(): Locator {
		return this.page.getByTestId('agent-session-run-data-input');
	}

	getOutputRunData(): Locator {
		return this.page.getByTestId('agent-session-run-data-output');
	}

	async openWorkflowLogNode(name: string): Promise<void> {
		await this.page.getByTestId('log-node-row').filter({ hasText: name }).click();
	}
}
