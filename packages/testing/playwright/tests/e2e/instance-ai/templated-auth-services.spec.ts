/**
 * THROWAWAY — Templated Custom Auth service-reliability sweep. Do not commit.
 *
 * Drives one naturalistic prompt per external service through the Instance AI
 * builder, completes every credential setup card with dummy secrets, and leaves
 * the recipe-created credentials persisted in the DB for manual grading.
 * Grading rubric + runbook: .context/templated-auth-e2e-plan.md.
 * Per-case JSON evidence (decrypted recipe fields + workflow nodes) is written
 * to .context/templated-auth-results/<slug>.json.
 */
import fs from 'node:fs';
import path from 'node:path';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);
// No serial mode: --workers=1 already runs cases sequentially, and a failing
// case must not cancel the rest of the survey.

const RESULTS_DIR = path.resolve(process.cwd(), '../../../.context/templated-auth-results');

interface ServiceCase {
	slug: string;
	prompt: string;
	/** false = record-only probe (e.g. TikTok may legitimately not produce a card) */
	expectCredential: boolean;
}

const CASES: ServiceCase[] = [
	{
		slug: 'fal-sync',
		prompt:
			'Build a workflow with a manual trigger that generates an image with fal.ai’s FLUX model from a hardcoded prompt and outputs the image URL.',
		expectCredential: true,
	},
	// fal-queue dropped from the matrix (2026-07-28): fal-sync already covers the
	// fal.ai credential recipe; the queue build is the slowest case in the sweep.
	{
		slug: 'replicate',
		prompt:
			'Build a workflow with a manual trigger that generates an image with Replicate’s flux-schnell model from a hardcoded prompt, waits for it to finish and outputs the result URL.',
		expectCredential: true,
	},
	{
		slug: 'apify',
		prompt:
			'Build a workflow with a manual trigger that runs Apify’s Website Content Crawler on https://example.com and outputs the crawled page text.',
		expectCredential: true,
	},
	{
		slug: 'creatomate',
		prompt:
			'Build a workflow with a manual trigger that renders a video from one of my Creatomate templates (hardcoded template ID) with a custom headline, waits for the render to finish, and outputs the video URL.',
		expectCredential: true,
	},
	{
		slug: 'elevenlabs',
		prompt:
			'Build a workflow with a manual trigger that converts the text ‘Hello from n8n’ to speech with ElevenLabs and outputs the audio.',
		expectCredential: true,
	},
	{
		slug: 'shotstack',
		prompt:
			'Build a workflow with a manual trigger that merges two hardcoded video clip URLs into one video with Shotstack, polls until the render is done, and outputs the final video URL.',
		expectCredential: true,
	},
	{
		slug: 'json2video',
		prompt:
			'Build a workflow with a manual trigger that makes a short video from a hardcoded headline and two image URLs using JSON2Video, waits for it to render, and outputs the video URL.',
		expectCredential: true,
	},
	{
		slug: 'apollo',
		prompt:
			'Build a workflow with a manual trigger that enriches the email john@acme.com with Apollo.io and outputs the person’s job title, company and LinkedIn URL.',
		expectCredential: true,
	},
	{
		slug: 'pexels',
		prompt:
			'Build a workflow with a manual trigger that searches Pexels for photos of mountains and outputs the top 5 photo URLs.',
		expectCredential: true,
	},
	{
		slug: 'tiktok',
		prompt:
			'Build a workflow with a manual trigger that fetches yesterday’s spend, impressions and clicks for my TikTok ad campaigns and outputs a summary.',
		expectCredential: false,
	},
	{
		slug: 'tavily',
		prompt:
			'Build a workflow with a manual trigger that searches the web with Tavily for the latest n8n release and outputs a short answer with source links.',
		expectCredential: true,
	},
	{
		slug: 'cloudinary',
		prompt:
			'Build a workflow with a manual trigger that fetches how much storage and bandwidth my Cloudinary account is using and outputs the numbers.',
		expectCredential: true, // expected type: httpBasicAuth (negative control for templating)
	},
];

for (const serviceCase of CASES) {
	test(`templated auth recipe: ${serviceCase.slug}`, async ({ n8n, api }) => {
		test.setTimeout(900_000);
		const page = n8n.page;
		const actions: string[] = [];

		// Quarantine generic-auth credentials left by earlier cases: httpTemplatedCustomAuth
		// is ONE type shared by all services, so the builder auto-attaches any existing one
		// (e.g. the Pexels credential onto fal.ai nodes) and skips the setup phase entirely.
		// Transferring them to an archive project keeps them in the DB but out of scope.
		const GENERIC_AUTH_TYPES = new Set([
			'httpTemplatedCustomAuth',
			'httpBasicAuth',
			'httpBearerAuth',
			'httpHeaderAuth',
			'httpQueryAuth',
			'httpCustomAuth',
		]);
		// TA_NO_QUARANTINE leaves existing credentials in scope — used to verify the
		// cross-service reuse guard (setup must raise a card, not auto-apply).
		const strays = process.env.TA_NO_QUARANTINE
			? []
			: ((await api.credentials.getCredentials()) as Array<{ id: string; type: string }>).filter(
					(c) => GENERIC_AUTH_TYPES.has(c.type),
				);
		if (strays.length > 0) {
			const archive = await api.projects.createProject(`ta-archive-${serviceCase.slug}`);
			for (const stray of strays) {
				await api.credentials.transferCredential(stray.id, archive.id).catch(() => {});
			}
			actions.push(`quarantined-${strays.length}-credentials`);
		}

		const credentialsBefore = new Set(
			((await api.credentials.getCredentials()) as Array<{ id: string }>).map((c) => c.id),
		);
		const workflowsBefore = new Set(
			((await api.workflows.getWorkflows()) as Array<{ id: string }>).map((w) => w.id),
		);

		await n8n.navigate.toInstanceAi();
		await n8n.instanceAi.sendMessage(serviceCase.prompt);

		const clickLocatorIfActionable = async (
			el: ReturnType<typeof page.locator>,
			label: string,
		): Promise<boolean> => {
			if (!(await el.isVisible().catch(() => false))) return false;
			if (!(await el.isEnabled().catch(() => false))) return false;
			await el.click().catch(() => {});
			actions.push(label);
			return true;
		};
		const clickIfActionable = async (testId: string, label: string): Promise<boolean> =>
			await clickLocatorIfActionable(page.getByTestId(testId).first(), label);
		// The wizard's footer button that submits the credential selection back to the agent.
		const applyButton = page.getByRole('button', { name: 'Apply', exact: true }).first();

		const completeCredentialCard = async (): Promise<void> => {
			const modal = page.getByTestId('editCredential-modal');
			await modal.waitFor({ state: 'visible', timeout: 15_000 });
			await page.waitForTimeout(1_500);

			const simpleView = modal.getByTestId('templated-auth-simple-view');
			if (await simpleView.isVisible().catch(() => false)) {
				const valueForms = simpleView.getByTestId('templated-auth-value-input');
				const count = await valueForms.count();
				for (let i = 0; i < count; i++) {
					await valueForms
						.nth(i)
						.locator('input, textarea')
						.first()
						.fill(`dummy-secret-${serviceCase.slug}-${i}`);
				}
				actions.push(`filled-templated-simple-view(${count})`);
			} else {
				// Non-templated modal (e.g. basic auth): fill whatever editable inputs the
				// connection tab shows so save succeeds.
				const inputs = modal.locator(
					'input[type="text"]:visible, input[type="password"]:visible, textarea:visible',
				);
				const count = await inputs.count();
				for (let i = 0; i < count; i++) {
					const input = inputs.nth(i);
					if (await input.isEditable().catch(() => false)) {
						await input.fill(`dummy-${serviceCase.slug}-${i}`).catch(() => {});
					}
				}
				actions.push(`filled-generic-modal(${count})`);
			}

			await modal.getByTestId('credential-save-button').click();
			// Save persists first; the auth probe then fails with dummy secrets and the
			// modal stays open — close it explicitly in that case.
			await page.waitForTimeout(6_000);
			if (await modal.isVisible().catch(() => false)) {
				await n8n.instanceAi.credentialModal.close().catch(() => {});
				actions.push('closed-modal-after-failed-probe');
			}
			// Submit the selection: workflow-setup wizard uses Apply, the credential
			// card uses Continue — Apply enables once the new credential is auto-selected.
			for (let attempt = 0; attempt < 12; attempt++) {
				await page.waitForTimeout(1_000);
				if (await clickLocatorIfActionable(applyButton, 'clicked-apply')) break;
				if (await clickIfActionable('instance-ai-credential-continue-button', 'clicked-continue'))
					break;
			}
		};

		// Drive the run: approve gates, complete credential cards, until idle.
		const deadline = Date.now() + 780_000;
		let idlePolls = 0;
		let sawCredentialCard = false;
		// A failing probe can keep the card incomplete (Apply gated on the test);
		// without this latch the dropdown branch below would create credentials
		// in a loop until the deadline.
		let dropdownCreateAttempted = false;
		while (Date.now() < deadline && idlePolls < 6) {
			// Recipe setup surfaces either as the workflow-setup wizard section or the
			// standalone credential card — both expose a "Set up credential(s)" button.
			const setupButton = page.getByRole('button', { name: /^Set up credential(s)?$/ }).first();
			if (
				(await setupButton.isVisible().catch(() => false)) &&
				(await setupButton.isEnabled().catch(() => false))
			) {
				sawCredentialCard = true;
				actions.push('opened-credential-setup');
				await setupButton.click().catch(() => {});
				await completeCredentialCard();
				idlePolls = 0;
				continue;
			}

			// A templated card with stored-but-unselected credentials renders the
			// standard credential select (no auto-select for the shared type) instead
			// of the empty-state setup button — create a fresh credential through the
			// dropdown's "Create new" action, at most once per case and only while
			// nothing is selected.
			const credentialSelect = page.getByTestId('node-credentials-select').first();
			const selectedName = await credentialSelect
				.locator('input')
				.first()
				.inputValue()
				.catch(() => '');
			if (
				!dropdownCreateAttempted &&
				selectedName === '' &&
				(await credentialSelect.isVisible().catch(() => false)) &&
				!(await page
					.getByTestId('editCredential-modal')
					.isVisible()
					.catch(() => false))
			) {
				dropdownCreateAttempted = true;
				sawCredentialCard = true;
				actions.push('opened-credential-dropdown');
				await credentialSelect.click().catch(() => {});
				const createNew = page.getByTestId('node-credentials-select-item-new').first();
				await createNew.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
				if (await createNew.isVisible().catch(() => false)) {
					await createNew.click().catch(() => {});
					actions.push('clicked-create-new-credential');
					await completeCredentialCard();
					idlePolls = 0;
					continue;
				}
			}

			const acted =
				(await clickIfActionable('instance-ai-plan-approve', 'approved-plan')) ||
				(await clickIfActionable('instance-ai-panel-confirm-approve', 'approved-confirmation')) ||
				(await clickIfActionable('domain-access-allow-once', 'allowed-domain-access')) ||
				(await clickLocatorIfActionable(applyButton, 'clicked-apply-outer')) ||
				(await clickIfActionable('instance-ai-credential-continue-button', 'clicked-continue'));
			if (acted) {
				idlePolls = 0;
				await page.waitForTimeout(2_000);
				continue;
			}

			const streaming = await n8n.instanceAi
				.getStopButton()
				.isVisible()
				.catch(() => false);
			idlePolls = streaming ? 0 : idlePolls + 1;
			await page.waitForTimeout(2_000);
		}

		// Evidence dump — decrypted recipe fields (placeholderValues stay redacted) + workflows.
		const credentialsAfter = (await api.credentials.getCredentials({
			includeData: true,
		})) as Array<{ id: string; name: string; type: string; data?: unknown }>;
		const createdCredentials = credentialsAfter.filter((c) => !credentialsBefore.has(c.id));

		// Auth-probe each created credential against its persisted testUrl. With dummy
		// secrets a CORRECT recipe yields a 401/403 rejection from the real service —
		// proving the testUrl exists and the templated auth is sent and evaluated.
		// DNS/404/timeouts expose invented URLs; OK with a dummy secret means the
		// endpoint doesn't actually validate auth (or no testUrl was persisted).
		const probes = [];
		for (const cred of createdCredentials) {
			const response = await api.request.post(`/rest/credentials/${cred.id}/probe`);
			probes.push({
				credential: cred.name,
				httpStatus: response.status(),
				result: await response.json().catch(() => null),
			});
		}

		const workflowsAfter = (await api.workflows.getWorkflows()) as Array<{ id: string }>;
		const createdWorkflows = [];
		for (const wf of workflowsAfter.filter((w) => !workflowsBefore.has(w.id))) {
			const full = await api.workflows.getWorkflow(wf.id);
			createdWorkflows.push({
				id: full.id,
				name: full.name,
				nodes: (full.nodes ?? []).map((node) => ({
					name: node.name,
					type: node.type,
					url: node.parameters?.url,
					method: node.parameters?.method,
					authentication: node.parameters?.authentication,
					genericAuthType: node.parameters?.genericAuthType,
					nodeCredentialType: node.parameters?.nodeCredentialType,
					credentials: node.credentials,
				})),
			});
		}

		const lastAssistantMessage = await page
			.getByTestId('instance-ai-assistant-message')
			.last()
			.innerText()
			.catch(() => '(none)');

		fs.mkdirSync(RESULTS_DIR, { recursive: true });
		fs.writeFileSync(
			path.join(RESULTS_DIR, `${serviceCase.slug}.json`),
			JSON.stringify(
				{
					slug: serviceCase.slug,
					prompt: serviceCase.prompt,
					sawCredentialCard,
					actions,
					credentials: createdCredentials,
					probes,
					workflows: createdWorkflows,
					lastAssistantMessage: lastAssistantMessage.slice(0, 2_000),
				},
				null,
				2,
			),
		);
		console.log(
			`[${serviceCase.slug}] card=${sawCredentialCard} credentials=${createdCredentials
				.map((c) => `${c.name}(${c.type})`)
				.join(', ')}`,
		);

		if (serviceCase.expectCredential) {
			expect(createdCredentials.length, 'a credential should have been created').toBeGreaterThan(0);
		}
	});
}
