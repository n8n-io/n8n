import flatted from 'flatted';
import type { IRunExecutionData, IWorkflowBase } from 'n8n-workflow';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';
import { resolveFromRoot } from '../../../utils/path-helper';

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_AGENTS_BACKGROUND_TASKS_ENABLED: 'true',
			N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
			TEST_ISOLATION: 'agent-background-workflow-stop',
		},
	},
});

function waitingWorkflow(revision: string): IWorkflowBase {
	const workflow: IWorkflowBase = JSON.parse(
		readFileSync(resolveFromRoot('workflows', 'wait-webhook-resume.json'), 'utf8'),
	);
	workflow.name = `Agent waiting workflow ${nanoid(8)}`;
	workflow.active = false;
	workflow.nodes[0] = {
		id: 'trigger',
		name: 'Start',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: { inputSource: 'passthrough' },
	};
	workflow.connections.Start = workflow.connections.Webhook;
	delete workflow.connections.Webhook;
	workflow.nodes[1].parameters = {
		assignments: {
			assignments: [
				{ id: 'url', name: 'resumeUrl', value: '={{ $execution.resumeUrl }}', type: 'string' },
				{ id: 'input', name: 'input', value: '={{ $json.value }}', type: 'string' },
				{ id: 'revision', name: 'revision', value: revision, type: 'string' },
			],
		},
		options: {},
	};
	workflow.settings = {
		executionOrder: 'v1',
		saveManualExecutions: true,
		saveDataSuccessExecution: 'all',
		saveDataErrorExecution: 'all',
	};
	return workflow;
}

async function mockModel(stack: N8NStack) {
	const message = {
		model: 'claude-sonnet-4-5',
		id: 'msg_workflow_stop',
		type: 'message',
		role: 'assistant',
		content: [],
		stop_reason: null,
		stop_sequence: null,
		usage: { input_tokens: 1, output_tokens: 1 },
	};
	const steps: Array<{ tool?: string; input?: Record<string, string>; delay?: number }> = [
		{ tool: 'run_waiting_workflow', input: { value: 'original' } },
		{},
		// Keep the report open while the early Continue request is queued.
		{ delay: 15 },
		{ tool: 'resume_background_jobs' },
		{},
		{ tool: 'resume_background_jobs' },
		{ tool: 'run_waiting_workflow', input: { value: 'continued' } },
	];
	for (const [index, step] of [...steps, {}].entries()) {
		const contentBlock = step.tool
			? { type: 'tool_use', id: `call_${index}`, name: step.tool, input: {} }
			: { type: 'text', text: '' };
		const delta = step.tool
			? { type: 'input_json_delta', partial_json: JSON.stringify(step.input ?? {}) }
			: { type: 'text_delta', text: 'Task update.' };
		const body = [
			{ type: 'message_start', message },
			{ type: 'content_block_start', index: 0, content_block: contentBlock },
			{ type: 'content_block_delta', index: 0, delta },
			{ type: 'content_block_stop', index: 0 },
			{
				type: 'message_delta',
				delta: { stop_reason: step.tool ? 'tool_use' : 'end_turn', stop_sequence: null },
				usage: { output_tokens: 3 },
			},
			{ type: 'message_stop' },
		]
			.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
			.join('');
		await stack.services.proxy.createExpectation({
			httpRequest: {
				method: 'POST',
				path: '/v1/messages',
				body: {
					type: 'JSON',
					json: JSON.stringify({ stream: true }),
					matchType: 'ONLY_MATCHING_FIELDS',
				},
			},
			httpResponse: {
				statusCode: 200,
				headers: { 'Content-Type': ['text/event-stream'] },
				body,
				...(step.delay ? { delay: { timeUnit: 'SECONDS', value: step.delay } } : {}),
			},
			times: index === steps.length ? { unlimited: true } : { remainingTimes: 1 },
		});
	}
	await stack.services.proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/v1/messages' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({
				...message,
				content: [{ type: 'text', text: 'Workflow stop' }],
				stop_reason: 'end_turn',
			}),
		},
		times: { unlimited: true },
	});
}

async function executionProgress(api: ApiHelpers, executionId: string) {
	const execution = await api.workflows.getExecution(executionId);
	const data: IRunExecutionData = flatted.parse(execution.data);
	const progress = data.resultData.runData['Capture Resume URL'][0].data?.main?.[0]?.[0]?.json;
	assert(progress && typeof progress.resumeUrl === 'string', 'Missing workflow callback URL');
	const resumeUrl = new URL(progress.resumeUrl);
	return { execution, data, progress, callbackPath: resumeUrl.pathname + resumeUrl.search };
}

test.describe(
	'Background workflow stop',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('cancels a waiting workflow and starts a fresh execution only after a new Continue request', async ({
			api,
			n8nContainer,
			mainUrls,
			createApiForMain,
		}) => {
			test.setTimeout(180_000);
			const stoppingApi = await createApiForMain(mainUrls.length - 1);
			const project = await api.projects.getMyPersonalProject();
			const workflow = await api.workflows.createWorkflow(waitingWorkflow('initial'), project.id);
			const credential = await api.credentials.createCredential({
				name: `Workflow stop model ${nanoid(8)}`,
				type: 'anthropicApi',
				data: { apiKey: 'workflow-stop-test-key' },
			});
			const agent = await api.agents.create(project.id, {
				name: `Workflow stop ${nanoid(8)}`,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Run the requested workflow. Continue stopped tasks only when the user asks.',
				tools: [
					{
						type: 'workflow',
						name: 'run_waiting_workflow',
						workflow: workflow.name,
						workflowId: workflow.id,
					},
				],
			});
			const threadId = randomUUID();
			const streams: Array<Awaited<ReturnType<typeof api.agents.openChat>>> = [];
			const chat = async (text: string, newSession?: true) => {
				const stream = await api.agents.openChat(mainUrls[0], project.id, agent.id, {
					message: text,
					messageId: randomUUID(),
					sessionId: threadId,
					newSession,
				});
				streams.push(stream);
				return stream;
			};
			const jobs = async () => await api.agents.backgroundTasks(project.id, agent.id, threadId);
			try {
				await mockModel(n8nContainer);
				const firstTurn = await chat('Start the workflow with value original.', true);
				expect(await firstTurn.done).toBeUndefined();
				expect(firstTurn.events.filter((event) => event.type === 'error')).toEqual([]);
				const [firstJob] = (await jobs()).tasks;
				expect(firstJob).toMatchObject({ kind: 'workflow', status: 'running' });
				const executions = await api.workflows.getExecutions(workflow.id);
				const original = executions.find((execution) => execution.workflowId === workflow.id);
				assert(original, 'Missing workflow execution');
				const beforeStop = await executionProgress(api, original.id);
				expect(beforeStop.execution.status).toBe('waiting');
				expect(beforeStop.progress).toMatchObject({ input: 'original', revision: 'initial' });

				const stop = await stoppingApi.agents.stopBackgroundTasks(project.id, agent.id, threadId);
				expect(stop.tasks).toEqual([]);
				const reportRequest = {
					method: 'POST',
					path: '/v1/messages',
					body: { type: 'REGEX', regex: '(?s)(?=.*"stream"\\s*:\\s*true)(?!.*"tools"\\s*:).*' },
				};
				await expect
					.poll(async () => await n8nContainer.services.proxy.wasRequestMade(reportRequest))
					.toBe(true);
				const earlyContinue = await chat('Continue');
				await expect
					.poll(async () => {
						const queued = earlyContinue.events.find((event) => event.type === 'message-queued');
						const { items } = await api.agents.queuedMessages(project.id, agent.id, threadId);
						return items.some((item) => item.id === queued?.queueId);
					})
					.toBe(true);
				expect((await jobs()).tasks).toEqual([]);
				expect((await api.workflows.getExecution(original.id)).status).toBe('canceled');
				const oldCallback = await api.webhooks.trigger(beforeStop.callbackPath, {
					maxNotFoundRetries: 0,
				});
				expect(oldCallback.ok()).toBe(false);
				const cancelled = await executionProgress(api, original.id);
				expect(cancelled.execution.status).toBe('canceled');
				expect(cancelled.data.resultData.runData['Set Result']).toBeUndefined();
				expect(await earlyContinue.done).toBeUndefined();
				const earlyHistory = await api.agents.history(project.id, agent.id, threadId);
				const earlyResume = earlyHistory.messages
					.flatMap((message) => message.content)
					.find((part) => part.toolName === 'resume_background_jobs');
				expect(earlyResume?.output).toMatchObject({ status: 'stopping' });
				expect(
					(await api.workflows.getExecutions(workflow.id)).map((execution) => execution.id),
				).toEqual([original.id]);

				await api.workflows.update(workflow.id, workflow.versionId, {
					nodes: waitingWorkflow('updated').nodes,
				});
				const continuation = await chat('Continue the workflow with value continued.');
				expect(await continuation.done).toBeUndefined();
				expect(continuation.events.filter((event) => event.type === 'error')).toEqual([]);
				const history = await api.agents.history(project.id, agent.id, threadId);
				const toolCalls = history.messages
					.flatMap((message) => message.content)
					.filter((part) => part.type === 'tool-call');
				const resume = toolCalls
					.filter((part) => part.toolName === 'resume_background_jobs')
					.at(-1);
				expect(resume?.output).toMatchObject({
					status: 'ready',
					jobs: [],
					workflowsToRestart: [
						{ jobId: firstJob.id, workflowId: workflow.id, previousExecutionId: original.id },
					],
				});
				expect(
					toolCalls
						.filter((part) => part.toolName === 'run_waiting_workflow')
						.map((part) => part.input),
				).toEqual([{ value: 'original' }, { value: 'continued' }]);
				const [replacementJob] = (await jobs()).tasks;
				expect(replacementJob).toMatchObject({ kind: 'workflow', status: 'running' });
				expect(replacementJob.id).not.toBe(firstJob.id);
				const replacement = (await api.workflows.getExecutions(workflow.id)).find(
					(execution) => execution.workflowId === workflow.id && execution.id !== original.id,
				);
				assert(replacement, 'Missing replacement execution');
				const restarted = await executionProgress(api, replacement.id);
				expect(restarted.execution.status).toBe('waiting');
				expect(restarted.progress).toMatchObject({ input: 'continued', revision: 'updated' });
				expect(restarted.callbackPath).not.toBe(beforeStop.callbackPath);
				expect((await api.webhooks.trigger(restarted.callbackPath)).ok()).toBe(true);
				await expect
					.poll(async () => (await api.workflows.getExecution(replacement.id)).status)
					.toBe('success');
				expect((await api.workflows.getExecution(original.id)).status).toBe('canceled');
				await expect.poll(async () => (await jobs()).tasks).toEqual([]);
			} finally {
				for (const stream of streams) stream.disconnect();
				await api.agents.delete(project.id, agent.id);
				await api.credentials.deleteCredential(credential.id);
			}
		});
	},
);
