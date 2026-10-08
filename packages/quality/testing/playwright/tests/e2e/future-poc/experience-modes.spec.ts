import type { InstanceAiThreadInfo } from '@n8n/api-types';
import type { IWorkflowBase } from 'n8n-workflow';

import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import type { A11yChecker } from '../../../fixtures/a11y';
import type { n8nPage } from '../../../pages/n8nPage';
import type { ApiHelpers } from '../../../services/api-helper';
import type { ScriptInput } from '../../../services/scripted-llm/scripted-llm.types';
import { expect, requireLinkedInstances, test } from './fixtures';

type Mode = 'simple' | 'power';

const MODE_LABELS = { simple: 'Simple', power: 'Power' } as const;
const AGENT_PROMPT = 'n8n Instance Agent';
const TEAM_PROJECT_NAME = 'Simple mode team';
const BLOCKING_IMPACTS = ['serious', 'critical'];
// Chats wait for the scripted model and for the chat list to refresh, so they take a while.
const CHAT_TIMEOUT_MS = 60_000;

/** A chat with a known title. The rename comes before the first run, so the title stays. */
async function createNamedChat(api: ApiHelpers, title: string): Promise<InstanceAiThreadInfo> {
	const thread = await api.createInstanceAiThread();
	return await api.renameInstanceAiThread(thread.id, title);
}

/** Saves the mode for the signed-in user, then opens the Assistant. The sidebar reads the mode on load. */
async function openInMode(n8n: n8nPage, mode: Mode): Promise<void> {
	await n8n.api.users.setExperienceMode(mode);
	await n8n.navigate.toInstanceAi();
}

function manualTriggerWorkflow(): Partial<IWorkflowBase> {
	return {
		name: 'Simple mode approval target',
		active: false,
		nodes: [
			{
				id: 'manual',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		settings: {},
	};
}

/**
 * The script of the chat-state test. The plain rule ends its run with text. The
 * approval rule calls `executions run`, which waits for the user to approve it.
 */
function chatStatesScript(workflowId: string): ScriptInput {
	return {
		rules: [
			{
				id: 'plain-answer',
				when: { systemIncludes: AGENT_PROMPT, userText: 'Plain question' },
				reply: { text: 'Plain answer.' },
			},
			{
				id: 'run-needs-approval',
				when: {
					systemIncludes: AGENT_PROMPT,
					userText: 'Approval question',
					toolAvailable: 'executions',
				},
				reply: {
					text: 'I will run the workflow.',
					toolCalls: [{ name: 'executions', input: { action: 'run', workflowId } }],
				},
			},
		],
		fallback: { text: 'Scripted fallback.' },
	};
}

/** Fails on serious or critical axe violations. Other impacts are reported only. */
async function expectNoBlockingViolations(a11y: A11yChecker): Promise<void> {
	const violations = await a11y.check('sidebar');
	const blocking = violations.filter((violation) =>
		BLOCKING_IMPACTS.includes(violation.impact ?? ''),
	);
	expect(blocking.map((violation) => `${violation.id} (${violation.impact})`)).toEqual([]);
}

// The linked-instance runner starts both instances. Skip when it is not running.
requireLinkedInstances();

test.describe(
	'Simple and Power modes',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test.describe.configure({ mode: 'serial' });

		// The Assistant home animates. Reduced motion keeps its frames still.
		test.beforeEach(async ({ n8n }) => {
			await n8n.page.emulateMedia({ reducedMotion: 'reduce' });
		});

		test(
			'a new user lands in Simple: Assistant, Chats, Automations and a collapsed Workspace',
			{ tag: '@auth:none' },
			async ({ n8n }) => {
				// Signed out, so the owner signs in through the form. The features are server
				// settings, so the sign-in page and the Assistant both see them.
				await n8n.start.withProjectFeatures();
				await n8n.signIn.loginWithEmailAndPassword(
					INSTANCE_OWNER_CREDENTIALS.email,
					INSTANCE_OWNER_CREDENTIALS.password,
				);
				await expect(n8n.page).toHaveURL(/\/assistant$/);

				// Simple mode keeps the chats on top. The Workspace holds the rest, so seed a
				// team project with a favorite and a chat before the sidebar loads.
				await createNamedChat(n8n.api, 'Simple mode chat');
				const project = await n8n.api.projects.createProject(TEAM_PROJECT_NAME);
				await n8n.api.projects.addFavorite(project.id);
				await n8n.navigate.toInstanceAi();

				await expect(n8n.instanceAi.getNewThreadButton()).toBeVisible();
				await expect(n8n.experienceModes.getOverviewEntry()).toBeVisible();
				await expect(n8n.experienceModes.getChatsSection()).toContainText('Simple mode chat');
				// The Automations list loads after the chats, so it can take a moment.
				await expect(n8n.experienceModes.getAutomationsSection()).toBeVisible({ timeout: 15_000 });

				// Personal and Shared are hidden until the Workspace opens.
				await expect(n8n.experienceModes.getWorkspaceToggle()).toHaveAttribute(
					'aria-expanded',
					'false',
				);
				await expect(n8n.experienceModes.getPersonalEntry()).toBeHidden();
				await expect(n8n.experienceModes.getSharedEntry()).toBeHidden();

				await n8n.experienceModes.getWorkspaceToggle().click();
				await expect(n8n.experienceModes.getWorkspaceToggle()).toHaveAttribute(
					'aria-expanded',
					'true',
				);
				await expect(n8n.experienceModes.getPersonalEntry()).toBeVisible();
				await expect(n8n.experienceModes.getSharedEntry()).toBeVisible();
				await expect(n8n.experienceModes.getSidebarButton('Favorites')).toBeVisible();
				await expect(n8n.experienceModes.getSidebarButton('Projects')).toBeVisible();
				await expect(n8n.experienceModes.getProjectRow(TEAM_PROJECT_NAME)).toBeVisible();
			},
		);

		test('Power shows the hidden items, keeps the choice on reload, and the command bar switches back', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();
			await expect(n8n.experienceModes.getModeOption(MODE_LABELS.simple)).toBeChecked();
			await expect(n8n.experienceModes.getPersonalEntry()).toBeHidden();

			await n8n.experienceModes.getModeOption(MODE_LABELS.power).click();
			await expect(n8n.experienceModes.getModeOption(MODE_LABELS.power)).toBeChecked();
			await expect(n8n.experienceModes.getPersonalEntry()).toBeVisible();
			await expect(n8n.experienceModes.getSharedEntry()).toBeVisible();
			expect(await n8n.api.users.getExperienceMode()).toBe('power');

			await n8n.page.reload();
			await expect(n8n.experienceModes.getModeOption(MODE_LABELS.power)).toBeChecked();
			await expect(n8n.experienceModes.getPersonalEntry()).toBeVisible();

			await n8n.commandBar.search('Switch to Simple mode');
			await expect(n8n.commandBar.getItem('Switch to Simple mode')).toBeVisible();
			await n8n.commandBar.getInput().press('Enter');
			await expect(n8n.experienceModes.getModeOption(MODE_LABELS.simple)).toBeChecked();
			await expect(n8n.experienceModes.getPersonalEntry()).toBeHidden();
			expect(await n8n.api.users.getExperienceMode()).toBe('simple');
		});

		test('the collapsed sidebar has one mode button that names the mode and switches it', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();
			await n8n.experienceModes.getMainSidebarToggle().click();

			const modeToggle = n8n.experienceModes.getCollapsedModeToggle();
			await expect(modeToggle).toHaveAccessibleName('Interface: Simple. Switch to Power');
			await modeToggle.click();
			await expect(modeToggle).toHaveAccessibleName('Interface: Power. Switch to Simple');
			await expect(n8n.experienceModes.getToast('Switched to Power mode')).toBeVisible();
			expect(await n8n.api.users.getExperienceMode()).toBe('power');

			await n8n.experienceModes.getMainSidebarToggle().click();
			await expect(n8n.experienceModes.getModeOption(MODE_LABELS.power)).toBeChecked();
		});

		test('chats show the state they need: Waiting for you, Ready to review and Done in Power, and the mark in Simple', async ({
			n8n,
			startLlm,
		}) => {
			const workflow: { id: string } = await n8n.api.workflows.createWorkflow(
				manualTriggerWorkflow(),
			);
			const llm = await startLlm(chatStatesScript(workflow.id));
			await n8n.api.setInstanceAiPermissions({ runWorkflow: 'require_approval' });

			const readyChat = await createNamedChat(n8n.api, 'Ready chat');
			await n8n.api.startInstanceAiChat(readyChat.id, 'Plain question about the weather');
			const waitingChat = await createNamedChat(n8n.api, 'Approval chat');
			await n8n.api.startInstanceAiChat(waitingChat.id, 'Approval question: run the workflow');

			await openInMode(n8n, 'power');
			await expect(
				n8n.experienceModes.getChatGroupItem('needs-you', 'Approval chat, Waiting for you'),
			).toBeVisible({ timeout: CHAT_TIMEOUT_MS });
			await expect(
				n8n.experienceModes.getChatGroupItem('ready', 'Ready chat, Ready to review'),
			).toBeVisible({ timeout: CHAT_TIMEOUT_MS });
			expect(llm.requests().map((request) => request.ruleId)).toEqual(
				expect.arrayContaining(['plain-answer', 'run-needs-approval']),
			);

			await openInMode(n8n, 'simple');
			await expect(n8n.experienceModes.getChatStateMark(readyChat.id)).toBeVisible({
				timeout: CHAT_TIMEOUT_MS,
			});
			await expect(
				n8n.experienceModes.getSidebarMenuItem('Approval chat, Waiting for you'),
			).toBeVisible();

			// Opening the chat marks it as seen. Its mark goes, and Power lists it as Done.
			await n8n.instanceAi.gotoThread(readyChat.id);
			await expect(n8n.experienceModes.getChatStateMark(readyChat.id)).toBeHidden();
			await openInMode(n8n, 'power');
			await expect(n8n.experienceModes.getChatGroupItem('done', 'Ready chat')).toBeVisible({
				timeout: CHAT_TIMEOUT_MS,
			});

			await n8n.instanceAi.gotoThread(waitingChat.id);
			await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible({
				timeout: CHAT_TIMEOUT_MS,
			});
		});

		test('the Simple + menu offers four items and New workflow opens the editor', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();
			const trigger = n8n.experienceModes.getInputMenuTrigger();
			await trigger.focus();
			await trigger.press('Enter');

			// "Connect local computer" needs the local gateway, which the e2e runner turns off.
			await expect(n8n.experienceModes.getInputMenuItems()).toHaveText([
				'Attach files',
				'Connect browser',
				'New workflow',
			]);

			const newWorkflow = n8n.experienceModes.getInputMenuItem('New workflow');
			await expect(newWorkflow).toBeEnabled();
			await newWorkflow.focus();
			await newWorkflow.press('Enter');
			await expect(n8n.page).toHaveURL(/\/workflow\/new/);
		});

		test('a workflow that the proposal card turns on shows in Automations as On', async () => {
			// Needs the seed helper that Q04 adds (tests/e2e/future-poc/helpers.ts). It is not in the tree yet.
			test.fixme(true, 'Waiting for the Q04 seed helper in tests/e2e/future-poc/helpers.ts');
		});

		test('the Simple sidebar and the Power groups have no serious or critical accessibility violations', async ({
			n8n,
			a11y,
		}) => {
			await createNamedChat(n8n.api, 'Accessibility chat');
			await n8n.navigate.toInstanceAi();
			await n8n.experienceModes.getWorkspaceToggle().click();
			await expect(n8n.experienceModes.getPersonalEntry()).toBeVisible();
			await expectNoBlockingViolations(a11y);

			await openInMode(n8n, 'power');
			await expect(
				n8n.experienceModes.getChatGroupItem('ready', 'Accessibility chat, Ready to review'),
			).toBeVisible({ timeout: CHAT_TIMEOUT_MS });
			await expectNoBlockingViolations(a11y);
			// A scan that did not run returns no violations, so check that the last scan ran.
			expect(a11y.scans.at(-1)?.bucket).toBe('sidebar');
		});
	},
);
