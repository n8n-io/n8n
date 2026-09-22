import type { n8nPage } from '../../../pages/n8nPage';
import type { InstanceAiSetupTrackingPage } from '../../../pages/InstanceAiSetupTrackingPage';
import { randomUUID } from 'crypto';
import { INSTANCE_AI_SETUP_PANEL_FLAG, type InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		// Telemetry capture is local to the main process.
		mains: 1,
		workers: 0,
		env: {
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'test-only-placeholder',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
		},
	},
});

test.describe(
	'Assistant workflow setup tracking',
	{ annotation: { type: 'owner', description: 'instanceAI' } },
	() => {
		test('counts workflows needing no setup only after the build is complete', async ({ n8n }) => {
			await n8n.start.fromHome();
			const project = await n8n.api.projects.getMyPersonalProject();
			const threadId = randomUUID();
			const thread = await n8n.api.instanceAi.createSetupThread({
				data: { threadId, projectId: project.id, source: 'playwright' },
			});
			expect(thread.ok()).toBe(true);
			const workflow = await n8n.api.workflows.createWorkflow(
				{
					name: `No setup ${threadId}`,
					nodes: [
						{
							id: 'trigger',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				},
				project.id,
			);
			const observe = async (buildComplete: boolean) => {
				const response = await n8n.api.instanceAi.observeSetup({
					data: { workflowId: workflow.id, threadId, buildComplete },
				});
				expect(response.ok()).toBe(true);
				return (await response.json()).data.snapshot;
			};
			const unfinished = await observe(false);
			expect(unfinished).toMatchObject({
				credential_count: 0,
				parameter_count: 0,
				items: [],
				build_complete: false,
				setup_complete: false,
			});
			const complete = await observe(true);
			expect(complete).toMatchObject({
				build_complete: true,
				setup_complete: true,
				cohort_started_at: unfinished.cohort_started_at,
			});
			expect(await observe(true)).toEqual(complete);
		});

		for (const asyncSetup of [false, true]) {
			const prepare = async (n8n: n8nPage) => {
				if (asyncSetup) {
					await n8n.instanceAiSetupTracking.row.click();
				} else await expect(n8n.instanceAi.workflowSetup.getContainer()).toBeVisible();
			};
			const sendPendingMessage = async (n8n: n8nPage) => {
				if (!asyncSetup) return;
				await n8n.instanceAi.getChatInput().fill('Continue while I finish setup');
				await n8n.instanceAi.getSendButton().click();
				await expect
					.poll(
						() =>
							n8n.instanceAiSetupTracking.events.find(
								(event) =>
									event.name === TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE.name,
							)?.properties.has_pending_setup,
					)
					.toBe(true);
			};
			const submit = async (n8n: n8nPage) => {
				if (asyncSetup) await n8n.instanceAiSetupTracking.confirm.click();
				else await n8n.instanceAi.workflowSetup.getApplyButton().click();
			};
			const verifyPanelRequest = async (
				n8n: n8nPage,
				{
					threadId,
					projectId,
					workflow,
					requests,
				}: Parameters<InstanceAiSetupTrackingPage['openFixture']>[0],
			) => {
				if (asyncSetup) {
					await n8n.instanceAiSetupTracking.openFixture({
						threadId,
						projectId,
						workflow,
						asyncSetup,
						requests,
					});
					await n8n.instanceAiSetupTracking.execute.click();
					await expect
						.poll(
							() =>
								n8n.instanceAiSetupTracking.events.filter(
									(event) =>
										event.name === TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST.name,
								).length,
						)
						.toBe(1);
					const request = n8n.instanceAiSetupTracking.events.find(
						(event) => event.name === TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST.name,
					);
					await expect
						.poll(
							async () =>
								(await (await n8n.api.instanceAi.getSetupState(workflow.id)).json()).data
									.testResults,
						)
						.toContainEqual(
							expect.objectContaining({
								test_request_id: request?.properties.test_request_id,
								source: 'instance_ai_setup_panel',
								status: 'success',
							}),
						);
				}
			};
			test(`records saved setup and real execution through the ${asyncSetup ? 'panel' : 'wizard'}`, async ({
				n8n,
				setupRequirements,
			}) => {
				await setupRequirements({
					storage: {
						N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
							[INSTANCE_AI_SETUP_PANEL_FLAG]: asyncSetup ? 'variant' : 'control',
						}),
					},
				});
				const tracking = n8n.instanceAiSetupTracking;
				await tracking.captureTelemetry();
				await n8n.start.fromHome();
				const project = await n8n.api.projects.getMyPersonalProject();
				const threadId = randomUUID();
				const threadResponse = await n8n.api.instanceAi.createSetupThread({
					data: { threadId, projectId: project.id, source: 'playwright' },
				});
				expect(threadResponse.ok()).toBe(true);
				const credential = await n8n.api.credentials.createCredential({
					name: `Setup ${threadId}`,
					type: 'httpHeaderAuth',
					data: { name: 'X-Setup-Test', value: 'test-only-value' },
				});
				const workflow: IWorkflowBase = await n8n.api.workflows.createWorkflow(
					{
						name: `Setup ${threadId}`,
						nodes: [
							{
								id: 'trigger',
								name: 'Start',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
							{
								id: 'request',
								name: 'Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4.2,
								position: [200, 0],
								parameters: {
									url: '',
									authentication: 'genericCredentialType',
									genericAuthType: 'httpHeaderAuth',
								},
							},
						],
						connections: { Start: { main: [[{ node: 'Request', type: 'main', index: 0 }]] } },
					},
					project.id,
				);
				const observed = await n8n.api.instanceAi.observeSetup({
					headers: { 'push-ref': 'fixture-session' },
					data: {
						workflowId: workflow.id,
						threadId,
						buildComplete: true,
					},
				});
				expect(observed.ok()).toBe(true);
				const initial = (await observed.json()).data.snapshot;
				expect(initial).toMatchObject({
					session_id: 'fixture-session',
					credential_count: 1,
					parameter_count: 1,
					pending_credential_count: 1,
					pending_parameter_count: 1,
					setup_complete: false,
				});
				const node = workflow.nodes[1];
				const requests: InstanceAiWorkflowSetupNode[] = [
					{
						node: { ...node, credentials: undefined },
						isTrigger: false,
						credentialType: 'httpHeaderAuth',
						credentialNeedsAction: true,
						parameterIssues: { url: ['Required'] },
						editableParameters: [{ name: 'url', displayName: 'URL', type: 'string' }],
						needsAction: true,
					},
				];
				await tracking.openFixture({
					threadId,
					projectId: project.id,
					workflow,
					asyncSetup,
					requests,
				});
				await prepare(n8n);
				await tracking.openNewCredential();
				await expect(n8n.instanceAi.credentialModal.getModal()).toBeVisible();
				await n8n.instanceAi.credentialModal.close();
				await expect
					.poll(
						() =>
							tracking.events.filter(
								(event) =>
									event.name ===
										TELEMETRY_EVENT.CREDENTIALS.USER_CANCELLED_CREDENTIAL_CONNECTION.name &&
									event.properties.reason === 'dialog_closed',
							).length,
					)
					.toBe(1);
				await tracking.selectCredential(credential.id);
				await sendPendingMessage(n8n);
				expect(
					tracking.events.filter(
						(event) => event.name === TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_PARAMETER_SETUP.name,
					),
				).toHaveLength(0);
				await tracking.parameter.fill(`${new URL(n8n.page.url()).origin}/healthz`);
				await expect
					.poll(
						() =>
							tracking.events.filter(
								(event) =>
									event.name === TELEMETRY_EVENT.INSTANCE_AI.USER_STARTED_PARAMETER_SETUP.name,
							).length,
					)
					.toBe(1);
				await submit(n8n);
				await expect
					.poll(async () => {
						const response = await n8n.api.instanceAi.getSetupState(workflow.id);
						return (await response.json()).data?.snapshot;
					})
					.toMatchObject({
						setup_complete: true,
						pending_credential_count: 0,
						pending_parameter_count: 0,
					});
				await expect
					.poll(() =>
						tracking.events.filter(
							(event) =>
								event.name ===
								TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION.name,
						),
					)
					.toHaveLength(1);
				const starts = tracking.events.filter(
					(event) =>
						event.name === TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION.name,
				);
				const completions = tracking.events.filter(
					(event) =>
						event.name === TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION.name,
				);
				expect(starts).toHaveLength(2);
				expect(new Set(starts.map((event) => event.properties.attempt_id)).size).toBe(2);
				expect(completions).toHaveLength(1);
				expect(completions[0].properties).toMatchObject({
					attempt_id: starts.find((event) => event.properties.method === 'existing')?.properties
						.attempt_id,
					item_id: initial.items.find((item: { kind: string }) => item.kind === 'credential')
						.item_id,
					method: 'existing',
					source: asyncSetup ? 'instance_ai_setup_panel' : 'instance_ai_setup_wizard',
				});
				// Leave the setup UI before the Assistant run. The backend owns its outcome.
				await n8n.navigate.toWorkflows();
				const simulation = await n8n.api.instanceAi.observeSetup({
					data: { workflowId: workflow.id, threadId, execute: true, simulate: true },
				});
				expect(simulation.ok()).toBe(true);
				const simulationResult = (await simulation.json()).data;
				expect(simulationResult.status).toBe('success');
				const run = await n8n.api.instanceAi.observeSetup({
					data: { workflowId: workflow.id, threadId, execute: true },
				});
				expect(run.ok()).toBe(true);
				const result = (await run.json()).data;
				expect(result.status).toBe('success');
				await expect
					.poll(async () => {
						const response = await n8n.api.instanceAi.getSetupState(workflow.id);
						return (await response.json()).data.testResults;
					})
					.toContainEqual(
						expect.objectContaining({
							execution_id: result.executionId,
							initiated_by: 'assistant',
							status: 'success',
						}),
					);
				const state = await n8n.api.instanceAi.getSetupState(workflow.id);
				expect((await state.json()).data.testResults).not.toContainEqual(
					expect.objectContaining({ execution_id: simulationResult.executionId }),
				);
				expect(
					tracking.events.filter(
						(event) => event.name === TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST.name,
					),
				).toHaveLength(0);
				await verifyPanelRequest(n8n, {
					threadId,
					projectId: project.id,
					workflow,
					asyncSetup,
					requests,
				});
			});
		}
	},
);
