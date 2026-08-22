import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { MessageBox } from './components/messageBoxLocators';

type AgentSessionStatusMock = 'running' | 'succeeded' | 'error' | 'cancelled' | 'interrupted';

// The filter dropdown's option labels don't all match their status value
// (`cancelled` renders as "Canceled"), so map explicitly rather than deriving
// the label from the value.
const STATUS_FILTER_LABELS: Record<AgentSessionStatusMock, string> = {
	running: 'Running',
	succeeded: 'Succeeded',
	error: 'Error',
	cancelled: 'Canceled',
	interrupted: 'Interrupted',
};

interface AgentThreadListMock {
	id: string;
	title: string;
	status: AgentSessionStatusMock;
	updatedAt?: string;
}

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

	/**
	 * Mocks the sessions list endpoint for the given threads, honouring the
	 * `status` query param the same way the real API filters server-side.
	 */
	async mockThreadsList(
		projectId: string,
		agentId: string,
		threads: AgentThreadListMock[],
	): Promise<void> {
		const threadsPath = `/rest/projects/${projectId}/agents/v2/${agentId}/threads`;

		await this.page.route(
			(url) => url.pathname === threadsPath,
			async (route) => {
				const statusFilter = new URL(route.request().url()).searchParams.get('status');
				const filtered = statusFilter
					? threads.filter((thread) => thread.status === statusFilter)
					: threads;

				await route.fulfill({
					json: {
						data: {
							threads: filtered.map((thread) => ({
								id: thread.id,
								agentId,
								agentName: 'Agent session E2E',
								parentThreadId: null,
								parentAgentId: null,
								projectId,
								taskId: null,
								sessionNumber: 1,
								title: thread.title,
								emoji: null,
								totalPromptTokens: 10,
								totalCompletionTokens: 5,
								totalCost: 0,
								totalDuration: 3_000,
								createdAt: thread.updatedAt ?? '2026-01-01T12:00:00.000Z',
								updatedAt: thread.updatedAt ?? '2026-01-01T12:00:00.000Z',
								firstMessage: null,
								source: 'chat',
								status: thread.status,
							})),
							nextCursor: null,
						},
					},
				});
			},
		);
	}

	async mockDeleteThread(projectId: string, agentId: string, threadId: string): Promise<void> {
		const threadPath = `/rest/projects/${projectId}/agents/v2/${agentId}/threads/${threadId}`;

		await this.page.route(
			(url) => url.pathname === threadPath,
			async (route) => {
				if (route.request().method() !== 'DELETE') {
					await route.fallback();
					return;
				}
				await route.fulfill({ json: { data: { success: true } } });
			},
		);
	}

	/** Mocks a session whose only execution ended in an error, without any tool calls. */
	async mockErrorSession({
		projectId,
		agentId,
		threadId,
		errorMessage,
	}: {
		projectId: string;
		agentId: string;
		threadId: string;
		errorMessage: string;
	}): Promise<void> {
		const createdAt = '2026-01-01T12:00:00.000Z';
		const stoppedAt = '2026-01-01T12:00:03.000Z';
		const thread = {
			id: threadId,
			agentId,
			agentName: 'Agent session E2E',
			parentThreadId: null,
			parentAgentId: null,
			projectId,
			taskId: null,
			sessionNumber: 1,
			title: 'Errored agent session',
			emoji: null,
			totalPromptTokens: 10,
			totalCompletionTokens: 5,
			totalCost: 0,
			totalDuration: 3_000,
			createdAt,
			updatedAt: stoppedAt,
			firstMessage: null,
			source: 'chat',
			status: 'error',
		};
		const execution = {
			id: 'agent-execution-e2e-error',
			threadId,
			agentId,
			status: 'error',
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
			timeline: [],
			error: errorMessage,
			hitlStatus: null,
			source: 'chat',
		};
		const threadsPath = `/rest/projects/${projectId}/agents/v2/${agentId}/threads`;

		await this.page.route(
			(url) => url.pathname === `${threadsPath}/${threadId}`,
			async (route) => {
				await route.fulfill({ json: { data: { thread, executions: [execution] } } });
			},
		);
	}

	getSessionRows(): Locator {
		return this.page.getByTestId('agent-session-list-item');
	}

	getEmptyState(): Locator {
		return this.page.getByTestId('agent-sessions-empty');
	}

	async openFilters(): Promise<void> {
		await this.page.getByTestId('agent-sessions-filter-button').click();
	}

	async filterByStatus(status: AgentSessionStatusMock): Promise<void> {
		await this.openFilters();
		await this.page.getByTestId('agent-sessions-filter-status').click();
		await this.page
			.getByRole('listbox')
			.filter({ visible: true })
			.getByRole('option', { name: STATUS_FILTER_LABELS[status], exact: true })
			.click();
	}

	async resetFilters(): Promise<void> {
		await this.page.getByTestId('agent-sessions-filter-reset').click();
	}

	async deleteSession(title: string): Promise<void> {
		const row = this.getSessionRows().filter({ hasText: title });
		await row.getByTestId('agent-session-actions').getByRole('button').click();
		await this.page.getByTestId('agent-session-actions-item-delete').click();
		await new MessageBox(this.page).confirmButton.click();
	}

	getSuccessToast(): Locator {
		return this.page.locator('.el-notification:has(.el-notification--success)');
	}

	getExecutionErrorCallout(): Locator {
		// This component uses `data-testid`, not the configured `data-test-id`
		// attribute, so it isn't reachable via getByTestId().
		return this.page.locator('[data-testid="execution-error-callout"]');
	}

	async goto(projectId: string, agentId: string, threadId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}/sessions/${threadId}`);
		await expect(this.getTimelineRows().first()).toBeVisible();
	}

	async gotoList(projectId: string, agentId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/agents/${agentId}/sessions`);
		// Waits on the table itself, not a row, so this also works for the empty-sessions case.
		await expect(this.page.getByTestId('table-base-scroll')).toBeVisible();
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
