import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

const CHILD_TRIGGER_NAME = 'When Executed by Another Workflow';
const CHILD_INPUT_NODE_NAME = 'Prepare workflow tool input';
const CHILD_OUTPUT_NODE_NAME = 'Prepare workflow tool output';
const NODE_TOOL_NAME = 'Node tool';
const WORKFLOW_TOOL_NAME = 'Workflow tool';

const NODE_INPUT_MARKER = 'node-tool-input-visible';
const NODE_OUTPUT_MARKER = 'node-tool-output-visible';
const WORKFLOW_INPUT_MARKER = 'workflow-tool-input-visible';
const WORKFLOW_OUTPUT_MARKER = 'workflow-tool-output-visible';
const LONG_SESSION_TITLE =
	'This is a long Agent session title that should be truncated to keep every column visible without horizontal scrolling';

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-sessions-tool-run-data',
		},
	},
});

function childWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Agent session child workflow ${nanoid(8)}`,
		active: false,
		nodes: [
			{
				id: nanoid(),
				name: CHILD_TRIGGER_NAME,
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { inputSource: 'passthrough' },
			},
			{
				id: nanoid(),
				name: CHILD_INPUT_NODE_NAME,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [240, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: nanoid(),
								name: 'workflowInput',
								value: WORKFLOW_INPUT_MARKER,
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
			{
				id: nanoid(),
				name: CHILD_OUTPUT_NODE_NAME,
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [480, 0],
				parameters: {
					assignments: {
						assignments: [
							{
								id: nanoid(),
								name: 'workflowOutput',
								value: WORKFLOW_OUTPUT_MARKER,
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
		],
		connections: {
			[CHILD_TRIGGER_NAME]: {
				main: [[{ node: CHILD_INPUT_NODE_NAME, type: 'main', index: 0 }]],
			},
			[CHILD_INPUT_NODE_NAME]: {
				main: [[{ node: CHILD_OUTPUT_NODE_NAME, type: 'main', index: 0 }]],
			},
		},
		settings: { saveManualExecutions: true },
	};
}

test.describe('Agent sessions', { annotation: [{ type: 'owner', description: 'AI' }] }, () => {
	test('fits long session titles within the sessions table', async ({ n8n, api }) => {
		const project = await api.projects.getMyPersonalProject();
		const agentId = `agent-${nanoid(8)}`;
		const threadId = `thread-${nanoid(8)}`;
		await n8n.agentSessions.mockSession({
			projectId: project.id,
			agentId,
			threadId,
			sessionTitle: LONG_SESSION_TITLE,
			nodeTool: { name: NODE_TOOL_NAME, input: {}, output: {} },
			workflowTool: {
				name: WORKFLOW_TOOL_NAME,
				workflowId: 'workflow-id',
				executionId: 'execution-id',
			},
		});

		await n8n.agentSessions.setViewportWidth(800);
		await n8n.start.fromHome();
		await n8n.agentSessions.gotoList(project.id, agentId);

		const tableWidth = await n8n.agentSessions.getSessionTableWidth();
		const narrowTitleWidth = await n8n.agentSessions.getSessionTitleWidth();
		expect(tableWidth.scrollWidth).toBe(tableWidth.clientWidth);
		expect(narrowTitleWidth.scrollWidth).toBeGreaterThan(narrowTitleWidth.clientWidth);

		await n8n.agentSessions.setViewportWidth(1_400);
		await expect
			.poll(async () => (await n8n.agentSessions.getSessionTitleWidth()).clientWidth)
			.toBeGreaterThan(narrowTitleWidth.clientWidth);
	});

	test('shows input and output data for node and workflow tools', async ({ n8n, api }) => {
		const project = await api.projects.getMyPersonalProject();
		const { workflowId } = await api.workflows.createWorkflowFromDefinition(childWorkflow(), {
			projectId: project.id,
		});
		const { executionId } = await api.workflows.runManually(workflowId, CHILD_TRIGGER_NAME);

		const agentId = `agent-${nanoid(8)}`;
		const threadId = `thread-${nanoid(8)}`;
		await n8n.agentSessions.mockSession({
			projectId: project.id,
			agentId,
			threadId,
			nodeTool: {
				name: NODE_TOOL_NAME,
				input: { request: NODE_INPUT_MARKER },
				output: { response: NODE_OUTPUT_MARKER },
			},
			workflowTool: {
				name: WORKFLOW_TOOL_NAME,
				workflowId,
				executionId,
			},
		});

		await n8n.start.fromHome();
		await n8n.agentSessions.goto(project.id, agentId, threadId);

		await n8n.agentSessions.openTimelineItem(NODE_TOOL_NAME);
		await expect(n8n.agentSessions.getInputRunData()).toContainText(NODE_INPUT_MARKER);
		await expect(n8n.agentSessions.getOutputRunData()).toContainText(NODE_OUTPUT_MARKER);

		await n8n.agentSessions.openTimelineItem(WORKFLOW_TOOL_NAME);
		await n8n.agentSessions.openWorkflowLogNode(CHILD_OUTPUT_NODE_NAME);
		await expect(n8n.agentSessions.getInputRunData()).toContainText(WORKFLOW_INPUT_MARKER);
		await expect(n8n.agentSessions.getOutputRunData()).toContainText(WORKFLOW_OUTPUT_MARKER);
	});
});
