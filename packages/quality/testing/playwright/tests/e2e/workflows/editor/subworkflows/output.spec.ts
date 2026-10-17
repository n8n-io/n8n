import flatted from 'flatted';
import { readFileSync } from 'fs';
import type { INode, IRunExecutionData, IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../../../fixtures/base';
import type { ApiHelpers } from '../../../../../services/api-helper';
import { resolveFromRoot } from '../../../../../utils/path-helper';

function definition(name: 'ado-5857-child.json' | 'ado-5857-parent.json'): IWorkflowBase {
	return JSON.parse(readFileSync(resolveFromRoot('workflows', name), 'utf8')) as IWorkflowBase;
}

function requiredNode(workflow: IWorkflowBase, name: string): INode {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	if (!node) throw new Error(`Missing fixture node: ${name}`);
	return node;
}

function childWithOutput(
	kind: 'filter' | 'emptyFilter' | 'switch' | 'inputSwitch' | 'if',
): IWorkflowBase {
	const child = definition('ado-5857-child.json');
	const last = requiredNode(child, 'Last');
	child.nodes = [requiredNode(child, 'Start'), last];
	child.connections = { Start: { main: [[{ node: 'Last', type: 'main', index: 0 }]] } };
	if (kind === 'switch' || kind === 'inputSwitch') {
		last.type = 'n8n-nodes-base.switch';
		last.typeVersion = kind === 'inputSwitch' ? 3.2 : 3.4;
		last.parameters = {
			mode: 'expression',
			numberOutputs: kind === 'inputSwitch' ? '={{ $json.id - 52 }}' : 3,
			output: kind === 'inputSwitch' ? 0 : 2,
		};
	} else {
		last.type = kind === 'if' ? 'n8n-nodes-base.if' : 'n8n-nodes-base.filter';
		last.parameters = {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
				conditions: [
					{
						id: 'id-equals',
						leftValue: '={{ $json.id }}',
						rightValue: kind === 'emptyFilter' ? 999 : 56,
						operator: { type: 'number', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
			options: {},
		};
	}
	return child;
}

function resumeUrlFrom(data: IRunExecutionData): string {
	const url = data.resultData.runData['Resume URL'][0].data?.main?.[0]?.[0].json.resumeUrl;
	if (typeof url !== 'string') throw new Error('Missing child resume URL');
	return url;
}

function changeDraftOutput(child: IWorkflowBase) {
	requiredNode(child, 'Start').typeVersion = 1.1;
	const last = requiredNode(child, 'Last');
	if (last.type === 'n8n-nodes-base.switch') last.parameters.numberOutputs = 1;
	// The collector must find the terminal node in the saved workflow.
	last.name = 'Draft last';
}

async function publishParent(api: ApiHelpers, childId: string, mode = 'once', ids = [55, 56, 57]) {
	const parent = definition('ado-5857-parent.json');
	requiredNode(parent, 'Items').parameters.jsonOutput = JSON.stringify({
		items: ids.map((id) => ({ id })),
	});
	const caller = requiredNode(parent, 'Call child');
	caller.parameters.workflowId = { __rl: true, value: childId, mode: 'id' };
	caller.parameters.mode = mode;
	const imported = await api.workflows.importWorkflowFromDefinition(parent);
	await api.workflows.activate(imported.workflowId, imported.createdWorkflow.versionId!);
	return imported;
}

async function output(api: ApiHelpers, parentId: string) {
	const execution = await api.workflows.waitForExecution(parentId, 15000);
	expect(execution.status).toBe('success');
	const details = await api.workflows.getExecution(execution.id);
	const data: IRunExecutionData = flatted.parse(details.data);
	return (
		data.resultData.runData.Result?.[0]?.data?.main?.[0]?.map(({ json }) => ({
			id: json.id,
			parentId: json.parentId,
		})) ?? []
	);
}

test.describe(
	'Sub-workflow output contract',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		for (const mode of ['once', 'each']) {
			test(`returns the reported false-branch items in ${mode} mode`, async ({ api }) => {
				const child = await api.workflows.importWorkflowFromDefinition(
					definition('ado-5857-child.json'),
				);
				await api.workflows.activate(child.workflowId, child.createdWorkflow.versionId!);
				const parent = await publishParent(api, child.workflowId, mode);
				expect((await api.webhooks.trigger(`/webhook/${parent.webhookPath}`)).ok()).toBe(true);
				expect(await output(api, parent.workflowId)).toEqual(
					[55, 56, 57].map((id) => ({ id, parentId: id })),
				);
			});
		}

		for (const { kind, ids } of [
			{ kind: 'filter', ids: [56] },
			{ kind: 'emptyFilter', ids: [] },
			{ kind: 'switch', ids: [55, 56, 57] },
			{ kind: 'inputSwitch', ids: [55, 56, 57] },
			{ kind: 'if', ids: [56, 55, 57] },
		] as const) {
			test(`returns declared ${kind} outputs with parent item links`, async ({ api }) => {
				const child = await api.workflows.importWorkflowFromDefinition(childWithOutput(kind));
				await api.workflows.activate(child.workflowId, child.createdWorkflow.versionId!);
				const parent = await publishParent(api, child.workflowId);
				await api.webhooks.trigger(`/webhook/${parent.webhookPath}`);
				expect(await output(api, parent.workflowId)).toEqual(
					ids.map((id) => ({ id, parentId: id })),
				);
			});
		}

		test('keeps the v1.2 output contract for an existing workflow', async ({ api }) => {
			const childDefinition = definition('ado-5857-child.json');
			requiredNode(childDefinition, 'Start').typeVersion = 1.2;
			const child = await api.workflows.importWorkflowFromDefinition(childDefinition);
			await api.workflows.activate(child.workflowId, child.createdWorkflow.versionId!);
			const parent = await publishParent(api, child.workflowId);
			await api.webhooks.trigger(`/webhook/${parent.webhookPath}`);
			expect(await output(api, parent.workflowId)).toEqual([]);
		});

		for (const { kind, ids } of [
			{ kind: 'filter', ids: [56] },
			{ kind: 'emptyFilter', ids: [] },
			{ kind: 'switch', ids: [56] },
			{ kind: 'inputSwitch', ids: [56] },
		] as const) {
			test(`returns ${kind} output after a persisted wait and an unpublished draft edit`, async ({
				api,
			}) => {
				const childDefinition = childWithOutput(kind);
				childDefinition.nodes.push(
					{
						id: 'restore',
						name: 'Restore input',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [150, 0],
						// A waiting webhook emits request data. Restore the saved child input.
						parameters: { mode: 'raw', jsonOutput: '={{ $("Start").first().json }}', options: {} },
					},
					{
						id: 'resume-url',
						name: 'Resume URL',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 0],
						parameters: {
							includeOtherFields: true,
							assignments: {
								assignments: [
									{
										id: 'resume',
										name: 'resumeUrl',
										type: 'string',
										value: '={{ $execution.resumeUrl }}',
									},
								],
							},
							options: {},
						},
					},
					{
						id: 'wait',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1.1,
						position: [100, 0],
						webhookId: 'child-wait',
						parameters: { resume: 'webhook', options: {} },
					},
				);
				childDefinition.connections = {
					Start: { main: [[{ node: 'Resume URL', type: 'main', index: 0 }]] },
					'Resume URL': { main: [[{ node: 'Wait', type: 'main', index: 0 }]] },
					Wait: { main: [[{ node: 'Restore input', type: 'main', index: 0 }]] },
					'Restore input': { main: [[{ node: 'Last', type: 'main', index: 0 }]] },
				};
				const child = await api.workflows.importWorkflowFromDefinition(childDefinition);
				await api.workflows.activate(child.workflowId, child.createdWorkflow.versionId!);
				const parent = await publishParent(api, child.workflowId, 'once', [56]);
				await api.webhooks.trigger(`/webhook/${parent.webhookPath}`);
				const waiting = await api.workflows.waitForWorkflowStatus(child.workflowId, 'waiting');
				await api.workflows.waitForWorkflowStatus(parent.workflowId, 'waiting');
				const details = await api.workflows.getExecution(waiting.id);
				const data: IRunExecutionData = flatted.parse(details.data);
				expect(data.subWorkflowOutput).toEqual({ lastRunOnly: false });
				const resumeUrl = resumeUrlFrom(data);
				changeDraftOutput(child.createdWorkflow);
				await api.workflows.update(child.workflowId, child.createdWorkflow.versionId!, {
					nodes: child.createdWorkflow.nodes,
					connections: {},
				});
				expect((await api.webhooks.trigger(resumeUrl)).ok()).toBe(true);
				expect(await output(api, parent.workflowId)).toEqual(
					ids.map((id) => ({ id, parentId: id })),
				);
			});
		}
	},
);
