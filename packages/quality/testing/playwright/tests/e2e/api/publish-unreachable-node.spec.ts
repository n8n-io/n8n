import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const AGENT = '@n8n/n8n-nodes-langchain.agent';
const PARSER = '@n8n/n8n-nodes-langchain.outputParserAutofixing';
const VECTOR_STORE_TOOL = '@n8n/n8n-nodes-langchain.toolVectorStore';
const IN_MEMORY_VECTOR_STORE = '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
const STRUCTURED_PARSER = '@n8n/n8n-nodes-langchain.outputParserStructured';

/**
 * A schedule trigger feeding a No-Op, plus an agent with an autofixing parser
 * attached. Neither the agent nor the parser has a language model, so both
 * declare an unmet required input.
 *
 * `reachable` decides whether the trigger feeds the agent. When it does not,
 * the agent and parser form an island: wired to each other, reached by nothing.
 */
function buildWorkflow(reachable: boolean): Partial<IWorkflowBase> {
	const nodes = [
		{
			id: nanoid(),
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [0, 0] as [number, number],
			parameters: { rule: { interval: [{ field: 'days' }] } },
		},
		{
			id: nanoid(),
			name: 'No Op',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [220, 0] as [number, number],
			parameters: {},
		},
		{
			id: nanoid(),
			name: 'Agent',
			type: AGENT,
			typeVersion: 2.2,
			position: [220, 260] as [number, number],
			parameters: { promptType: 'define', text: 'hello', hasOutputParser: true },
		},
		{
			id: nanoid(),
			name: 'Parser',
			type: PARSER,
			typeVersion: 1,
			position: [420, 420] as [number, number],
			parameters: {},
		},
	];

	const connections: IWorkflowBase['connections'] = {
		'Schedule Trigger': {
			main: [[{ node: reachable ? 'Agent' : 'No Op', type: 'main', index: 0 }]],
		},
		Parser: {
			ai_outputParser: [[{ node: 'Agent', type: 'ai_outputParser', index: 0 }]],
		},
	};

	return {
		name: `required input reachability ${nanoid()}`,
		nodes,
		connections,
		settings: { executionOrder: 'v1' },
	};
}

test.describe(
	'Publishing a workflow with unmet required inputs',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		const cleanupWorkflowIds: string[] = [];
		const cleanupCredentialIds: string[] = [];

		test.afterEach(async ({ api }) => {
			// The published cases leave a daily schedule active, which would keep
			// firing on a persistent stack.
			while (cleanupWorkflowIds.length > 0) {
				const workflowId = cleanupWorkflowIds.pop() as string;

				// A refusal case never activated, so this is expected to fail there.
				try {
					await api.workflows.deactivate(workflowId);
				} catch {
					// not active
				}

				// Archive first. The API refuses to delete a workflow that is not
				// archived, so deleting straight away leaves the row behind.
				await api.workflows.archive(workflowId);
				await api.workflows.delete(workflowId);
			}

			while (cleanupCredentialIds.length > 0) {
				await api.credentials.deleteCredential(cleanupCredentialIds.pop() as string);
			}
		});

		test('publishes when the nodes with unmet inputs cannot be reached', async ({ api }) => {
			const created = await api.workflows.createWorkflow(buildWorkflow(false));
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(
				response.ok(),
				`publish was refused over nodes no run can reach: ${await response.text()}`,
			).toBe(true);

			// Activation lands through the publication outbox. Poll for it before the
			// teardown deactivates, so cleanup cannot race the publish.
			await expect
				.poll(async () => (await api.workflows.getPublicationStatus(created.id)).status, {
					timeout: 15_000,
				})
				.toBe('published');
		});

		test('publishes a subnode nested behind a disabled parent', async ({ api }) => {
			// The tool only feeds the disabled agent, and the vector store only feeds
			// the tool, so nothing ever asks the store for its Embedding input.
			// Stopping at the first consumer reads the store as live, because the tool
			// between them is enabled.
			const created = await api.workflows.createWorkflow({
				name: `nested behind a disabled parent ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.2,
						position: [0, 0],
						parameters: { rule: { interval: [{ field: 'days' }] } },
					},
					{
						id: nanoid(),
						name: 'Agent',
						type: AGENT,
						typeVersion: 2.2,
						position: [220, 0],
						parameters: { promptType: 'define', text: 'hello' },
						disabled: true,
					},
					{
						id: nanoid(),
						name: 'Store Tool',
						type: VECTOR_STORE_TOOL,
						typeVersion: 1,
						position: [220, 260],
						// Set so the parameter validator passes and the required-input
						// check is what this test actually exercises.
						parameters: { name: 'store_tool', description: 'company docs' },
					},
					{
						id: nanoid(),
						name: 'Store',
						type: IN_MEMORY_VECTOR_STORE,
						typeVersion: 1.3,
						position: [420, 420],
						parameters: {},
					},
				],
				connections: {
					'Schedule Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
					'Store Tool': { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
					Store: {
						ai_vectorStore: [[{ node: 'Store Tool', type: 'ai_vectorStore', index: 0 }]],
					},
				},
				settings: { executionOrder: 'v1' },
			});
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(
				response.ok(),
				`publish was refused over a subnode nothing can reach: ${await response.text()}`,
			).toBe(true);

			await expect
				.poll(async () => (await api.workflows.getPublicationStatus(created.id)).status, {
					timeout: 15_000,
				})
				.toBe('published');
		});

		test('publishes a subnode left on its own beside a healthy agent', async ({ api }) => {
			// The chat model is reachable, so the pre-existing credential check applies to
			// it. Give it one, or the refusal under test is masked by a credential error.
			const credential = await api.credentials.createCredential({
				name: `anthropic ${nanoid()}`,
				type: 'anthropicApi',
				data: { apiKey: 'sk-ant-not-a-real-key' },
			});
			cleanupCredentialIds.push(credential.id);

			// A Structured Output Parser dragged onto the canvas with Auto-Fix Format on
			// and never wired to anything. Its own `Model` input is required and unmet,
			// but no run reaches it, so it must not hold up the agent beside it. The
			// agent's own Output Parser input is exposed and empty, which is allowed:
			// only Chat Model and Fallback Model are required on the agent.
			const created = await api.workflows.createWorkflow({
				name: `lone subnode ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.2,
						position: [0, 0],
						parameters: { rule: { interval: [{ field: 'days' }] } },
					},
					{
						id: nanoid(),
						name: 'Sentiment Analyzer',
						type: AGENT,
						typeVersion: 2.2,
						position: [260, 0],
						parameters: { promptType: 'define', text: 'hello', hasOutputParser: true },
					},
					{
						id: nanoid(),
						name: 'Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						typeVersion: 1.3,
						position: [200, 300],
						parameters: {
							model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-5' },
							options: {},
						},
						credentials: { anthropicApi: { id: credential.id, name: credential.name } },
					},
					{
						id: nanoid(),
						name: 'Structured Output Parser',
						type: STRUCTURED_PARSER,
						typeVersion: 1.3,
						position: [560, 300],
						parameters: { jsonSchemaExample: '{ "sentiment": "positive" }', autoFix: true },
					},
				],
				connections: {
					'Schedule Trigger': {
						main: [[{ node: 'Sentiment Analyzer', type: 'main', index: 0 }]],
					},
					'Chat Model': {
						ai_languageModel: [
							[{ node: 'Sentiment Analyzer', type: 'ai_languageModel', index: 0 }],
						],
					},
				},
				settings: { executionOrder: 'v1' },
			});
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(
				response.ok(),
				`publish was refused over a subnode wired to nothing: ${await response.text()}`,
			).toBe(true);

			await expect
				.poll(async () => (await api.workflows.getPublicationStatus(created.id)).status, {
					timeout: 15_000,
				})
				.toBe('published');
		});

		test('refuses to publish when the same nodes are reachable', async ({ api }) => {
			const created = await api.workflows.createWorkflow(buildWorkflow(true));
			cleanupWorkflowIds.push(created.id);

			const response = await api.workflows.activateRaw(created.id, created.versionId);

			expect(response.ok()).toBe(false);
			expect(await response.text()).toContain('has no node connected to its required');
		});
	},
);
