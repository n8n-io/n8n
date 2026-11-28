import type { Locator, Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'node-6353-app-header-narrow-layout',
			N8N_ENABLED_MODULES: 'apps,instance-ai',
			N8N_APPS_BASE_URL: 'http://apps.example.test',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_BROWSER_USE_ENABLED: 'false',
		},
	},
});

/**
 * Returns the horizontal overlap in pixels between two locators when they share
 * vertical space, or 0 when they do not overlap (including when wrapped onto
 * separate rows).
 */
async function getHorizontalOverlapPx(first: Locator, second: Locator): Promise<number> {
	const firstBox = await first.boundingBox();
	const secondBox = await second.boundingBox();
	expect(firstBox).not.toBeNull();
	expect(secondBox).not.toBeNull();

	const verticalOverlap =
		Math.min(firstBox!.y + firstBox!.height, secondBox!.y + secondBox!.height) -
		Math.max(firstBox!.y, secondBox!.y);
	if (verticalOverlap <= 0) return 0;

	const horizontalOverlap =
		Math.min(firstBox!.x + firstBox!.width, secondBox!.x + secondBox!.width) -
		Math.max(firstBox!.x, secondBox!.x);
	return Math.max(0, Math.round(horizontalOverlap));
}

/**
 * Resolves the topmost element at the visual center of `target`.
 * Returns `'self'` when `target` itself receives pointer hits, or the
 * obstructing element's `data-test-id` / tag name otherwise.
 */
async function getHitTargetAtCenter(target: Locator): Promise<string> {
	return await target.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
		if (!hit) return 'none';
		if (element.contains(hit)) return 'self';
		return hit.closest('[data-test-id]')?.getAttribute('data-test-id') ?? hit.tagName.toLowerCase();
	});
}

async function expectWithinHeaderBounds(header: Locator, target: Locator, label: string) {
	const headerBox = await header.boundingBox();
	const targetBox = await target.boundingBox();
	expect(headerBox).not.toBeNull();
	expect(targetBox).not.toBeNull();

	expect(targetBox!.x, `${label} must stay inside header left edge`).toBeGreaterThanOrEqual(
		headerBox!.x,
	);
	expect(
		targetBox!.x + targetBox!.width,
		`${label} must stay inside header right edge`,
	).toBeLessThanOrEqual(headerBox!.x + headerBox!.width + 1);
	expect(targetBox!.y, `${label} must stay inside header top edge`).toBeGreaterThanOrEqual(
		headerBox!.y,
	);
	expect(
		targetBox!.y + targetBox!.height,
		`${label} must stay inside header bottom edge`,
	).toBeLessThanOrEqual(headerBox!.y + headerBox!.height + 1);
}

async function clickCenter(page: Page, target: Locator) {
	const box = await target.boundingBox();
	expect(box).not.toBeNull();
	await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

async function waitForLayoutSettled(page: Page, header: Locator, viewportWidth: number) {
	await expect
		.poll(async () => {
			const box = await header.boundingBox();
			return box ? Math.round(box.x + box.width) : Infinity;
		})
		.toBeLessThanOrEqual(viewportWidth);
	await page.evaluate(
		async () =>
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}

async function openAppInAssistantAtViewport(
	n8n: n8nPage,
	threadId: string,
	viewportWidth: number,
	sidebarState: 'collapsed' | 'expanded',
) {
	await n8n.page.setViewportSize({ width: viewportWidth, height: 768 });
	await n8n.start.fromHome();
	if (sidebarState === 'collapsed') {
		await n8n.sideBar.collapse();
	} else {
		await n8n.sideBar.expand();
	}

	await n8n.instanceAi.gotoThread(threadId);
	const header = n8n.instanceAi.getAppHeader();
	const configureTab = n8n.instanceAi.getAppConfigureTab();
	const publishButton = n8n.instanceAi.getAppPublishButton();

	await expect(header).toBeVisible();
	await expect(configureTab).toBeVisible();
	await expect(publishButton).toBeVisible();
	await expect(publishButton).toBeEnabled();

	await expect
		.poll(async () => (await n8n.sideBar.container.boundingBox())?.width ?? 0)
		.toBe(sidebarState === 'collapsed' ? 42 : 200);
	await waitForLayoutSettled(n8n.page, header, viewportWidth);
}

// NODE-6353: In a narrow Assistant app panel, the Configure tab must not
// overlap the Publish button or intercept clicks aimed at Publish.
test.describe(
	'NODE-6353: App panel header layout in narrow viewports',
	{
		annotation: [
			{ type: 'owner', description: 'NODES' },
			{ type: 'issue', description: 'NODE-6353' },
		],
	},
	() => {
		let threadId: string;
		let projectId: string;
		let appId: string;

		test.beforeEach(async ({ n8n, api, setupRequirements }) => {
			await api.updateInstanceAiSettings({ enabled: true, searchDisabled: true });
			await setupRequirements({
				config: { moduleSettings: { 'instance-ai': { enabled: true, setupCompleted: true } } },
			});

			const project = await api.projects.getMyPersonalProject();
			projectId = project.id;
			const slug = randomUUID().replace(/-/g, '').slice(0, 10);
			const app = await api.apps.create(project.id, {
				name: `Header layout ${slug}`,
				namespace: `header-${slug}`,
			});
			appId = app.id;
			threadId = randomUUID();
			await api.instanceAi.createAppArtifactThread({
				threadId,
				projectId: project.id,
				appId: app.id,
				name: app.name,
			});
			await n8n.instanceAi.mockBuiltAppVersion(project.id, app.id, randomUUID());
		});

		test('keeps the Configure tab clear of the Publish button at 1024 px', async ({ n8n }) => {
			await openAppInAssistantAtViewport(n8n, threadId, 1024, 'collapsed');

			const header = n8n.instanceAi.getAppHeader();
			const previewTab = n8n.instanceAi.getAppPreviewTab();
			const configureTab = n8n.instanceAi.getAppConfigureTab();
			const publishButton = n8n.instanceAi.getAppPublishButton();

			await expectWithinHeaderBounds(header, configureTab, 'Configure tab');
			await expectWithinHeaderBounds(header, publishButton, 'Publish button');
			expect(
				await getHorizontalOverlapPx(configureTab, publishButton),
				'Configure tab and Publish button must not overlap at 1024 px',
			).toBe(0);
			expect(
				await getHitTargetAtCenter(publishButton),
				'Center of Publish must hit Publish at 1024 px',
			).toBe('self');

			await clickCenter(n8n.page, publishButton);

			await expect(n8n.modal.container).toBeVisible();
			await expect(n8n.modal.getText('Publish app')).toBeVisible();
			await expect(previewTab).toHaveAttribute('data-state', 'checked');
			await expect(configureTab).toHaveAttribute('data-state', 'unchecked');
		});

		test('does not overlap Configure and Publish at 682 px with the sidebar collapsed', async ({
			n8n,
		}) => {
			await openAppInAssistantAtViewport(n8n, threadId, 682, 'collapsed');

			const header = n8n.instanceAi.getAppHeader();
			const previewTab = n8n.instanceAi.getAppPreviewTab();
			const configureTab = n8n.instanceAi.getAppConfigureTab();
			const publishButton = n8n.instanceAi.getAppPublishButton();

			await expectWithinHeaderBounds(header, configureTab, 'Configure tab');
			await expectWithinHeaderBounds(header, publishButton, 'Publish button');
			expect(
				await getHorizontalOverlapPx(configureTab, publishButton),
				'Configure tab and Publish button must not overlap in a narrow app panel',
			).toBe(0);
			expect(
				await getHitTargetAtCenter(configureTab),
				'Center of Configure must hit Configure at 682 px',
			).toBe('self');
			expect(
				await getHitTargetAtCenter(publishButton),
				'Center of Publish must hit Publish at 682 px',
			).toBe('self');

			await clickCenter(n8n.page, configureTab);
			await expect(configureTab).toHaveAttribute('data-state', 'checked');
			await expect(previewTab).toHaveAttribute('data-state', 'unchecked');
		});

		test('keeps Publish clickable at 682 px with the sidebar open without opening Configure', async ({
			n8n,
		}) => {
			await openAppInAssistantAtViewport(n8n, threadId, 682, 'expanded');

			const header = n8n.instanceAi.getAppHeader();
			const previewTab = n8n.instanceAi.getAppPreviewTab();
			const configureTab = n8n.instanceAi.getAppConfigureTab();
			const publishButton = n8n.instanceAi.getAppPublishButton();

			await expect(previewTab).toHaveAttribute('data-state', 'checked');
			await expect(configureTab).toHaveAttribute('data-state', 'unchecked');
			await expectWithinHeaderBounds(header, configureTab, 'Configure tab');
			await expectWithinHeaderBounds(header, publishButton, 'Publish button');

			expect
				.soft(
					await getHorizontalOverlapPx(configureTab, publishButton),
					'Configure tab and Publish button must not overlap with the sidebar open',
				)
				.toBe(0);
			expect
				.soft(
					await getHitTargetAtCenter(publishButton),
					'Center of Publish must hit Publish instead of Configure',
				)
				.toBe('self');
			expect
				.soft(
					await getHitTargetAtCenter(configureTab),
					'Center of Configure must hit Configure with the sidebar open',
				)
				.toBe('self');

			await clickCenter(n8n.page, publishButton);

			await expect(
				configureTab,
				'Clicking the center of Publish must not switch to Configure',
			).toHaveAttribute('data-state', 'unchecked');
			await expect(previewTab).toHaveAttribute('data-state', 'checked');
			await expect(n8n.modal.container).toBeVisible();
			await expect(n8n.modal.getText('Publish app')).toBeVisible();
		});

		test('keeps Share, Publish, and Configure clear and clickable for a published app at 682 px', async ({
			n8n,
		}) => {
			await n8n.instanceAi.mockPublishedAppUrl(projectId, appId, 'http://apps.example.test/');
			await openAppInAssistantAtViewport(n8n, threadId, 682, 'expanded');

			const header = n8n.instanceAi.getAppHeader();
			const previewTab = n8n.instanceAi.getAppPreviewTab();
			const configureTab = n8n.instanceAi.getAppConfigureTab();
			const shareButton = n8n.instanceAi.getAppShareButton();
			const publishButton = n8n.instanceAi.getAppPublishButton();

			await expect(shareButton).toBeVisible();
			await expectWithinHeaderBounds(header, configureTab, 'Configure tab');
			await expectWithinHeaderBounds(header, shareButton, 'Share button');
			await expectWithinHeaderBounds(header, publishButton, 'Publish button');

			expect(
				await getHorizontalOverlapPx(configureTab, shareButton),
				'Configure tab and Share button must not overlap',
			).toBe(0);
			expect(
				await getHorizontalOverlapPx(configureTab, publishButton),
				'Configure tab and Publish button must not overlap',
			).toBe(0);
			expect(
				await getHorizontalOverlapPx(shareButton, publishButton),
				'Share button and Publish button must not overlap',
			).toBe(0);
			expect(await getHitTargetAtCenter(configureTab)).toBe('self');
			expect(await getHitTargetAtCenter(shareButton)).toBe('self');
			expect(await getHitTargetAtCenter(publishButton)).toBe('self');

			await clickCenter(n8n.page, shareButton);

			await expect(n8n.instanceAi.getAppSharePopoverContent()).toBeVisible();
			await expect(previewTab).toHaveAttribute('data-state', 'checked');
			await expect(configureTab).toHaveAttribute('data-state', 'unchecked');
		});
	},
);
