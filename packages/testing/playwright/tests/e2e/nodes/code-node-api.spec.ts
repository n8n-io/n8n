import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { workflow, trigger, node } from '../../../../../@n8n/workflow-sdk/src';
import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

type CodeExecutionMode = 'runOnceForAllItems' | 'runOnceForEachItem';

interface CodeNodeWebhookPayload {
	codeNode?: {
		config?: {
			mode?: CodeExecutionMode;
		};
		jsCode?: string;
	};
	input?: unknown;
}

function createCodeWebhookHarnessWorkflow(): IWorkflowBase {
	const webhookNode = trigger({
		type: 'n8n-nodes-base.webhook',
		version: 2.1,
		config: {
			name: 'Webhook',
			parameters: {
				path: 'code-node-api',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				options: {},
			},
		},
	});

	const codeNode = node({
		type: 'n8n-nodes-base.code',
		version: 1,
		config: {
			name: 'Code',
			onError: 'continueErrorOutput',
			parameters: {
				mode: '={{ $json.body.codeNode && $json.body.codeNode.config && $json.body.codeNode.config.mode ? $json.body.codeNode.config.mode : "runOnceForAllItems" }}',
				jsCode:
					'={{ $json.body.codeNode && $json.body.codeNode.jsCode ? $json.body.codeNode.jsCode : "return $input.all();" }}',
			},
		},
	});

	const respondNode = node({
		type: 'n8n-nodes-base.respondToWebhook',
		version: 1.5,
		config: {
			name: 'Respond to Webhook',
			parameters: {
				respondWith: 'allIncomingItems',
				options: {},
			},
		},
	});

	const wf = workflow(nanoid(), `Code node webhook harness ${nanoid()}`)
		.add(webhookNode.to(codeNode))
		.add(codeNode.to(respondNode))
		.add(codeNode.onError(respondNode));

	const json = wf.toJSON() as IWorkflowBase;
	json.active = true;
	json.settings = { executionOrder: 'v1' };

	return json;
}

async function executeCodeViaWebhook(
	webhookPath: string,
	api: ApiHelpers,
	payload: CodeNodeWebhookPayload,
): Promise<Array<Record<string, unknown>>> {
	const webhookResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
		method: 'POST',
		data: payload,
	});

	if (!webhookResponse.ok()) {
		throw new Error(
			`Webhook call failed with ${webhookResponse.status()}: ${await webhookResponse.text()}`,
		);
	}

	return (await webhookResponse.json()) as Array<Record<string, unknown>>;
}

test.describe(
	'Code node API execution with reusable webhook harness @capability:task-runner',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		let webhookPath: string;
		let workflowId: string;

		test.beforeAll(async ({ api }) => {
			const {
				webhookPath: createdWebhookPath,
				workflowId: createdWorkflowId,
				createdWorkflow,
			} = await api.workflows.createWorkflowFromDefinition(createCodeWebhookHarnessWorkflow(), {
				makeUnique: true,
			});

			expect(createdWebhookPath).toBeDefined();
			webhookPath = createdWebhookPath!;
			workflowId = createdWorkflowId;
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
		});

		test('should execute webhook-configured runOnceForAllItems code with webhook-provided input', async ({
			api,
		}) => {
			const cases: Array<{
				name: string;
				payload: CodeNodeWebhookPayload;
				expected: Array<Record<string, unknown>>;
			}> = [
				{
					name: 'sum values from input payload',
					payload: {
						codeNode: {
							config: { mode: 'runOnceForAllItems' },
							jsCode: `
								const values = $json.body.input.values;
								const sum = values.reduce((acc, value) => acc + value, 0);
								return [{ sum }];
							`,
						},
						input: { values: [1, 2] },
					},
					expected: [{ sum: 3 }],
				},
				{
					name: 'support async code with promise resolution',
					payload: {
						codeNode: {
							config: { mode: 'runOnceForAllItems' },
							jsCode: `
								const values = $json.body.input.values;
								return await Promise.all(
									values.map(async (value) => ({
										value,
										myNewField: await Promise.resolve(value),
									})),
								);
							`,
						},
						input: { values: [1, 2] },
					},
					expected: [
						{ value: 1, myNewField: 1 },
						{ value: 2, myNewField: 2 },
					],
				},
			];

			for (const testCase of cases) {
				await test.step(testCase.name, async () => {
					const responseItems = await executeCodeViaWebhook(webhookPath, api, testCase.payload);
					expect(responseItems).toEqual(testCase.expected);
				});
			}
		});

		test('should execute webhook-configured runOnceForEachItem code', async ({ api }) => {
			const responseItems = await executeCodeViaWebhook(webhookPath, api, {
				codeNode: {
					config: { mode: 'runOnceForEachItem' },
					jsCode: `
						const value = await Promise.resolve($json.body.input.value);
						return { value, myNewField: value };
					`,
				},
				input: { value: 42 },
			});

			expect(responseItems).toEqual([{ value: 42, myNewField: 42 }]);
		});

		test('should normalize valid runOnceForAllItems return values', async ({ api }) => {
			const cases: Array<{
				name: string;
				jsCode: string;
				expected: Array<Record<string, unknown>>;
			}> = [
				{
					name: 'pre-normalized return',
					jsCode: 'return [{ json: { count: 42 } }];',
					expected: [{ count: 42 }],
				},
				{
					name: 'single item return',
					jsCode: 'return { json: { count: 42 } };',
					expected: [{ count: 42 }],
				},
				{
					name: 'array item without json key',
					jsCode: 'return [{ count: 42 }];',
					expected: [{ count: 42 }],
				},
				{
					name: 'single item without json key',
					jsCode: 'return { count: 42 };',
					expected: [{ count: 42 }],
				},
			];

			for (const testCase of cases) {
				await test.step(testCase.name, async () => {
					const responseItems = await executeCodeViaWebhook(webhookPath, api, {
						codeNode: {
							config: { mode: 'runOnceForAllItems' },
							jsCode: testCase.jsCode,
						},
					});
					expect(responseItems).toEqual(testCase.expected);
				});
			}
		});

		test('should normalize valid runOnceForEachItem return values', async ({ api }) => {
			const cases: Array<{
				name: string;
				jsCode: string;
				expected: Array<Record<string, unknown>>;
			}> = [
				{
					name: 'pre-normalized return',
					jsCode: 'return { json: { count: 42 } };',
					expected: [{ count: 42 }],
				},
				{
					name: 'single item without json key',
					jsCode: 'return { count: 42 };',
					expected: [{ count: 42 }],
				},
			];

			for (const testCase of cases) {
				await test.step(testCase.name, async () => {
					const responseItems = await executeCodeViaWebhook(webhookPath, api, {
						codeNode: {
							config: { mode: 'runOnceForEachItem' },
							jsCode: testCase.jsCode,
						},
					});
					expect(responseItems).toEqual(testCase.expected);
				});
			}
		});

		test('should return validation errors for invalid json in runOnceForAllItems', async ({
			api,
		}) => {
			const cases = [
				'return [{ json: null }];',
				'return [{ json: new Date() }];',
				"return [{ json: 'string' }];",
				'return [{ json: true }];',
				'return [{ json: [] }];',
			];

			for (const jsCode of cases) {
				await test.step(jsCode, async () => {
					await executeCodeViaWebhook(webhookPath, api, {
						codeNode: {
							config: { mode: 'runOnceForAllItems' },
							jsCode,
						},
					});

					const execution = await api.workflows.waitForExecution(workflowId, 15000, 'webhook');
					const executionDetails = await api.workflows.getExecution(execution.id);
					expect(JSON.stringify(executionDetails.data)).toContain(
						"A 'json' property isn't an object [item 0]",
					);
				});
			}
		});

		test('should return validation errors for invalid json in runOnceForEachItem', async ({
			api,
		}) => {
			const cases = [
				'return { json: null };',
				'return { json: new Date() };',
				"return { json: 'string' };",
				'return { json: true };',
				'return { json: [] };',
			];

			for (const jsCode of cases) {
				await test.step(jsCode, async () => {
					await executeCodeViaWebhook(webhookPath, api, {
						codeNode: {
							config: { mode: 'runOnceForEachItem' },
							jsCode,
						},
					});

					const execution = await api.workflows.waitForExecution(workflowId, 15000, 'webhook');
					const executionDetails = await api.workflows.getExecution(execution.id);
					expect(JSON.stringify(executionDetails.data)).toContain(
						"A 'json' property isn't an object [item 0]",
					);
				});
			}
		});
	},
);
