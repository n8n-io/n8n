import { nanoid } from 'nanoid';
import type { IWorkflowBase } from 'n8n-workflow';

import type { n8nPage } from '../../../pages/n8nPage';
import type { ApiHelpers } from '../../../services/api-helper';
import type { ScriptInput } from '../../../services/scripted-llm/scripted-llm.types';
import { TestError } from '../../../Types';
import { expect, requireLinkedInstances, test, type AssistantRun } from './fixtures';

type Mode = 'simple' | 'power';

// The system prompt of the Assistant agent starts with this text. The scripted rules use it
// to skip title and memory calls.
const AGENT_PROMPT = 'n8n Instance Agent';
const CLOUD_NAME = 'Cloud';
const PROPOSAL_REPLY = 'I can keep this and turn it on.';
const PROPOSAL_TITLE = 'Morning digest';
const PROPOSAL_ASK = 'Turn it into an automation';
const CREDENTIAL_NAME = 'Stripe key';
// Chats wait for the scripted model, the card and the copy on the other instance.
const STEP_TIMEOUT_MS = 60_000;

type NamedWorkflow = { id: string; name: string; active: boolean };

requireLinkedInstances();

test.describe(
	'Automation proposals on a linked instance',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test.describe.configure({ mode: 'serial' });

		test('Power mode recommends the cloud, and Turn it on copies the workflow there and turns it on', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Cloud digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const workflow = await n8n.api.workflows.createWorkflow(scheduleWorkflow(workflowName));
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');

			await expect(n8n.experienceModes.getProposalPlace()).toContainText(CLOUD_NAME);
			await expect(n8n.experienceModes.getProposalPlace()).toContainText(
				'it keeps going when this computer is off',
			);
			await expect(n8n.experienceModes.getProposalChangeTarget()).toBeVisible();
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeEnabled({
				timeout: STEP_TIMEOUT_MS,
			});

			await n8n.experienceModes.getProposalTurnOnButton().click();
			await expectResolved(n8n, 'on', CLOUD_NAME);
			const remote = n8n.experienceModes.getProposalOpenRemote();
			await expect(remote).toBeVisible();
			await expect(remote).toHaveAttribute(
				'href',
				new RegExp(`^${escapeRegExp(cloudUrl)}/workflow/`),
			);
			await expect(remote).toHaveAttribute('target', '_blank');

			const copy = await waitForWorkflow(cloudApi, workflowName);
			expect(copy.active).toBe(true);
			await expect
				.poll(async () => (await n8n.api.workflows.getWorkflow(workflow.id)).active)
				.toBe(false);
		});

		test('Power mode can keep the automation on this computer instead', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Local digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const workflow = await n8n.api.workflows.createWorkflow(scheduleWorkflow(workflowName));
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeEnabled({
				timeout: STEP_TIMEOUT_MS,
			});

			await n8n.experienceModes.getProposalChangeTarget().click();
			await n8n.experienceModes.getProposalTargetOption(/^This computer/).click();

			await expect(n8n.experienceModes.getProposalPlace()).toContainText('This computer');
			await expect(n8n.experienceModes.getProposalCaveat()).toContainText(
				'Only runs while this computer is on.',
			);
			await expect(n8n.experienceModes.getProposalPreflight()).toBeHidden();

			await n8n.experienceModes.getProposalTurnOnButton().click();
			await expectResolved(n8n, 'on', 'This computer');
			await expect
				.poll(async () => (await n8n.api.workflows.getWorkflow(workflow.id)).active, {
					timeout: STEP_TIMEOUT_MS,
				})
				.toBe(true);
			expect(await findWorkflow(cloudApi, workflowName)).toBeUndefined();
		});

		test('a missing credential holds Turn it on, and Save copies the workflow switched off', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Credential digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const credential = await n8n.api.credentials.createCredential({
				name: CREDENTIAL_NAME,
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: 'secret' },
			});
			const workflow = await n8n.api.workflows.createWorkflow(
				credentialWorkflow(workflowName, credential.id),
			);
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');

			await expect(n8n.experienceModes.getProposalPreflightSetUp()).toContainText(CREDENTIAL_NAME, {
				timeout: STEP_TIMEOUT_MS,
			});
			await expect(n8n.experienceModes.getProposalPreflightSetUp()).toContainText(CLOUD_NAME);
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeDisabled();
			await expect(n8n.experienceModes.getProposalSaveButton()).toBeEnabled();
			await expect(n8n.experienceModes.getProposalNotNowButton()).toBeEnabled();

			await n8n.experienceModes.getProposalSaveButton().click();
			await expectResolved(n8n, 'saved', CLOUD_NAME);

			const copy = await waitForWorkflow(cloudApi, workflowName);
			expect(copy.active).toBe(false);
			expect((await n8n.api.workflows.getWorkflow(workflow.id)).active).toBe(false);
		});

		test('Not now leaves the workflow off on both instances', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Declined digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const workflow = await n8n.api.workflows.createWorkflow(scheduleWorkflow(workflowName));
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');
			await expect(n8n.experienceModes.getProposalNotNowButton()).toBeEnabled({
				timeout: STEP_TIMEOUT_MS,
			});

			await n8n.experienceModes.getProposalNotNowButton().click();
			await expectResolved(n8n, 'declined');
			expect((await n8n.api.workflows.getWorkflow(workflow.id)).active).toBe(false);
			expect(await findWorkflow(cloudApi, workflowName)).toBeUndefined();
		});

		test('Simple mode shows only the cloud recommendation and still turns the copy on there', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Simple digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const workflow = await n8n.api.workflows.createWorkflow(scheduleWorkflow(workflowName));
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'simple');

			await expect(n8n.experienceModes.getProposalChangeTarget()).toBeHidden();
			await expect(n8n.experienceModes.getProposalPlace()).toContainText(CLOUD_NAME);
			await expect(n8n.experienceModes.getProposalPlace()).toContainText(
				'it keeps going when this computer is off',
			);
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeEnabled({
				timeout: STEP_TIMEOUT_MS,
			});

			await n8n.experienceModes.getProposalTurnOnButton().click();
			await expectResolved(n8n, 'on', CLOUD_NAME);
			const copy = await waitForWorkflow(cloudApi, workflowName);
			expect(copy.active).toBe(true);
		});

		test('a command on this computer stays here, and Power mode can still choose the cloud', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Local command ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const workflow = await n8n.api.workflows.createWorkflow(commandWorkflow(workflowName));
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');

			await expect(n8n.experienceModes.getProposalPlace()).toContainText('This computer');
			await expect(n8n.experienceModes.getProposalPlace()).toContainText(
				'it runs commands on this computer',
			);
			await expect(n8n.experienceModes.getProposalCaveat()).toBeVisible();
			await expect(n8n.experienceModes.getProposalPreflight()).toBeHidden();

			await n8n.experienceModes.getProposalChangeTarget().click();
			await n8n.experienceModes.getProposalTargetOption(/^Cloud/).click();
			await expect(n8n.experienceModes.getProposalPlace()).toContainText(`Runs on ${CLOUD_NAME}`);
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeEnabled({
				timeout: STEP_TIMEOUT_MS,
			});

			await n8n.experienceModes.getProposalChangeTarget().click();
			await n8n.experienceModes.getProposalTargetOption(/^This computer/).click();
			await n8n.experienceModes.getProposalTurnOnButton().click();
			await expectResolved(n8n, 'on', 'This computer');
			await expect
				.poll(async () => (await n8n.api.workflows.getWorkflow(workflow.id)).active, {
					timeout: STEP_TIMEOUT_MS,
				})
				.toBe(true);
			expect(await findWorkflow(cloudApi, workflowName)).toBeUndefined();
		});

		test('a workflow that calls another workflow by ID offers only this computer', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Parent digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const child = await n8n.api.workflows.createWorkflow(manualWorkflow(`Child ${nanoid(8)}`));
			const workflow = await n8n.api.workflows.createWorkflow(
				callingWorkflow(workflowName, child.id),
			);
			await openProposal(n8n, startLlm, startAssistantRun, workflow.id, 'power');

			await expect(n8n.experienceModes.getProposalChangeTarget()).toBeHidden();
			await expect(n8n.experienceModes.getProposalPlace()).toContainText('This computer');
			await expect(n8n.experienceModes.getProposalPreflight()).toBeHidden();

			await n8n.experienceModes.getProposalTurnOnButton().click();
			await expectResolved(n8n, 'on', 'This computer');
			await expect
				.poll(async () => (await n8n.api.workflows.getWorkflow(workflow.id)).active, {
					timeout: STEP_TIMEOUT_MS,
				})
				.toBe(true);
			expect(await findWorkflow(cloudApi, workflowName)).toBeUndefined();
		});

		test('a call added after the card keeps the workflow here until the user chooses this computer', async ({
			n8n,
			cloudApi,
			cloudUrl,
			startLlm,
			startAssistantRun,
		}) => {
			const workflowName = `Changed digest ${nanoid(8)}`;
			await linkCloud(n8n.api, cloudApi, cloudUrl);
			const child = await n8n.api.workflows.createWorkflow(
				manualWorkflow(`Later child ${nanoid(8)}`),
			);
			const workflow = await n8n.api.workflows.createWorkflow(scheduleWorkflow(workflowName));
			const chatId = await propose(n8n, startLlm, startAssistantRun, workflow.id);
			const current = await n8n.api.workflows.getWorkflow(workflow.id);
			if (!current.versionId) throw new TestError('The workflow has no version id');
			await n8n.api.workflows.update(
				workflow.id,
				current.versionId,
				callingWorkflow(workflowName, child.id),
			);

			await n8n.api.users.setExperienceMode('power');
			await n8n.start.fromInstanceAiThread(chatId);
			await expect(n8n.experienceModes.getProposalCard()).toBeVisible({ timeout: STEP_TIMEOUT_MS });
			await expect(n8n.experienceModes.getProposalPreflightBlocked()).toContainText(
				"It can't go to Cloud, because it calls other workflows by ID.",
				{ timeout: STEP_TIMEOUT_MS },
			);
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeDisabled();
			await expect(n8n.experienceModes.getProposalSaveButton()).toBeDisabled();
			await expect(n8n.experienceModes.getProposalNotNowButton()).toBeEnabled();

			await n8n.experienceModes.getProposalKeepHere().click();
			await expect(n8n.experienceModes.getProposalPlace()).toContainText('This computer');
			await expect(n8n.experienceModes.getProposalPreflight()).toBeHidden();
			await expect(n8n.experienceModes.getProposalTurnOnButton()).toBeEnabled();
		});
	},
);

/** Turns on MCP on Cloud and stores the link on this computer. */
async function linkCloud(api: ApiHelpers, cloudApi: ApiHelpers, cloudUrl: string): Promise<void> {
	await cloudApi.setMcpAccess(true);
	const { apiKey } = await cloudApi.rotateMcpApiKey();
	const link = await api.linkInstance({ name: CLOUD_NAME, url: cloudUrl, token: apiKey });
	if (link.status !== 'online') {
		throw new TestError(`The cloud link is "${link.status}", not online`);
	}
}

/** Asks for the proposal and returns the chat id. The page is not open yet. */
async function propose(
	n8n: n8nPage,
	startLlm: (script: ScriptInput) => Promise<unknown>,
	startAssistantRun: (threadId: string, message: string) => Promise<AssistantRun>,
	workflowId: string,
): Promise<string> {
	const chat = await n8n.api.createInstanceAiThread();
	await n8n.api.renameInstanceAiThread(chat.id, `Automation ${nanoid(6)}`);
	await startLlm(proposeScript(workflowId));
	const run = await startAssistantRun(chat.id, PROPOSAL_ASK);
	await expect
		.poll(() => suspensionsOf(run).length, { timeout: STEP_TIMEOUT_MS })
		.toBeGreaterThan(0);
	run.disconnect();
	return chat.id;
}

/** Proposes the workflow, then opens the chat in the given mode so the card is on screen. */
async function openProposal(
	n8n: n8nPage,
	startLlm: (script: ScriptInput) => Promise<unknown>,
	startAssistantRun: (threadId: string, message: string) => Promise<AssistantRun>,
	workflowId: string,
	mode: Mode,
): Promise<void> {
	const chatId = await propose(n8n, startLlm, startAssistantRun, workflowId);
	await n8n.api.users.setExperienceMode(mode);
	await n8n.start.fromInstanceAiThread(chatId);
	await expect(n8n.instanceAi.getPanelText(PROPOSAL_REPLY)).toBeVisible({
		timeout: STEP_TIMEOUT_MS,
	});
	await expect(n8n.experienceModes.getProposalCard()).toBeVisible({ timeout: STEP_TIMEOUT_MS });
}

/** The answered card. `place` is omitted when the line does not name one. */
async function expectResolved(n8n: n8nPage, status: string, place?: string): Promise<void> {
	await expect(n8n.experienceModes.getProposalResolved()).toBeVisible({ timeout: STEP_TIMEOUT_MS });
	await expect(n8n.experienceModes.getProposalCard()).toBeHidden();
	const line = n8n.experienceModes.getProposalResolvedStatus();
	await expect(line).toHaveAttribute('data-status', status, { timeout: STEP_TIMEOUT_MS });
	if (place !== undefined) await expect(line).toContainText(place);
}

function proposeScript(workflowId: string): ScriptInput {
	return {
		rules: [
			{
				id: 'propose-automation',
				when: {
					systemIncludes: AGENT_PROMPT,
					userText: PROPOSAL_ASK,
					toolAvailable: 'propose_automation',
				},
				reply: {
					text: PROPOSAL_REPLY,
					toolCalls: [
						{
							name: 'propose_automation',
							input: {
								workflowId,
								title: PROPOSAL_TITLE,
								why: ['It should run every morning.'],
							},
						},
					],
				},
			},
		],
		fallback: { text: 'Scripted fallback.' },
	};
}

function suspensionsOf(run: AssistantRun) {
	return run.events.flatMap((event) =>
		event.type === 'tool-call-suspended' ? [event.payload] : [],
	);
}

async function findWorkflow(api: ApiHelpers, name: string): Promise<NamedWorkflow | undefined> {
	const workflows: NamedWorkflow[] = await api.workflows.getWorkflows();
	return workflows.find((workflow) => workflow.name === name);
}

/** Waits until the other instance lists the workflow, then returns it. */
async function waitForWorkflow(api: ApiHelpers, name: string): Promise<NamedWorkflow> {
	let found: NamedWorkflow | undefined;
	await expect
		.poll(
			async () => {
				found = await findWorkflow(api, name);
				return found !== undefined;
			},
			{ timeout: STEP_TIMEOUT_MS },
		)
		.toBe(true);
	if (!found) throw new TestError(`No workflow named "${name}"`);
	return found;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function at(x: number, y: number): [number, number] {
	return [x, y];
}

function scheduleNode() {
	return {
		id: 'schedule',
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: at(0, 0),
		parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 8 }] } },
	};
}

function scheduleWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			scheduleNode(),
			{
				id: 'noop',
				name: 'No Operation',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: at(240, 0),
				parameters: {},
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'No Operation', type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}

function credentialWorkflow(name: string, credentialId: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			scheduleNode(),
			{
				id: 'http',
				name: 'Charge',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: at(240, 0),
				parameters: {
					url: 'https://example.test/charge',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: { httpHeaderAuth: { id: credentialId, name: CREDENTIAL_NAME } },
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'Charge', type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}

function commandWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			scheduleNode(),
			{
				id: 'command',
				name: 'Run a command',
				type: 'n8n-nodes-base.executeCommand',
				typeVersion: 1,
				position: at(240, 0),
				parameters: { command: 'echo hello' },
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'Run a command', type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}

function manualWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'manual',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: at(0, 0),
				parameters: {},
			},
		],
		connections: {},
		settings: {},
	};
}

function callingWorkflow(name: string, childId: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			scheduleNode(),
			{
				id: 'call',
				name: 'Run the report',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: at(240, 0),
				parameters: {
					source: 'database',
					workflowId: { __rl: true, mode: 'id', value: childId },
				},
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'Run the report', type: 'main', index: 0 }]] },
		},
		settings: {},
	};
}
