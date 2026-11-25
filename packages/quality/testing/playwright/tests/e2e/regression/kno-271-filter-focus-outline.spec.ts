import type { Locator, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

interface ClippingAncestorReport {
	tag: string;
	className: string;
	overflowX: string;
	overflowY: string;
	clipsX: boolean;
	clipsY: boolean;
	clipLeft: number;
	clipRight: number;
	clipTop: number;
	clipBottom: number;
	clippedSides: string[];
}

interface OutlineClippingReport {
	outlineWidth: number;
	outlineOffset: number;
	outlineStyle: string;
	outlineRect: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	};
	clippingAncestors: ClippingAncestorReport[];
}

async function waitForAncestorAnimations(element: Locator): Promise<void> {
	await element.evaluate(async (el) => {
		const animations: Animation[] = [];
		let current: Element | null = el;
		while (current && current !== document.documentElement) {
			animations.push(...current.getAnimations());
			current = current.parentElement;
		}
		await Promise.allSettled(animations.map(async (animation) => await animation.finished));
	});
}

/**
 * Opens a filter popover with the keyboard, waits for the panel to render,
 * and tabs until the target control has DOM focus.
 */
async function openPopoverAndFocusWithKeyboard(
	page: Page,
	trigger: Locator,
	panel: Locator,
	target: Locator,
): Promise<void> {
	await trigger.focus();
	await expect(trigger).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(panel).toBeVisible();
	await waitForAncestorAnimations(panel);

	for (let step = 0; step < 10; step++) {
		if (await target.evaluate((el) => document.activeElement === el)) {
			break;
		}
		await page.keyboard.press('Tab');
	}

	await expect(target).toBeFocused();
}

async function measureFocusOutline(controlRoot: Locator): Promise<OutlineClippingReport | null> {
	return await controlRoot.evaluate((root): OutlineClippingReport | null => {
		const candidates: Element[] = [root, ...root.querySelectorAll('*')];
		const outlinedEl = candidates.find((el) => {
			const style = getComputedStyle(el);
			const width = parseFloat(style.outlineWidth) || 0;
			return (
				style.outlineStyle !== 'none' &&
				width > 0 &&
				style.outlineColor !== 'transparent' &&
				style.outlineColor !== 'rgba(0, 0, 0, 0)'
			);
		});

		if (!outlinedEl) {
			return null;
		}

		const rect = outlinedEl.getBoundingClientRect();
		const style = getComputedStyle(outlinedEl);
		const outlineWidth = parseFloat(style.outlineWidth) || 0;
		const outlineOffset = parseFloat(style.outlineOffset) || 0;
		const outward = Math.max(0, outlineWidth + outlineOffset);
		const outlineRect = {
			left: rect.left - outward,
			right: rect.right + outward,
			top: rect.top - outward,
			bottom: rect.bottom + outward,
		};

		const clipValues = new Set(['hidden', 'clip', 'scroll', 'auto']);
		const clippingAncestors: ClippingAncestorReport[] = [];

		let ancestor = outlinedEl.parentElement;
		while (ancestor && ancestor !== document.documentElement) {
			const aStyle = getComputedStyle(ancestor);
			const clipsX = clipValues.has(aStyle.overflowX);
			const clipsY = clipValues.has(aStyle.overflowY);

			if (clipsX || clipsY) {
				const aRect = ancestor.getBoundingClientRect();
				if (aRect.width > 0 && aRect.height > 0) {
					const borderLeft = parseFloat(aStyle.borderLeftWidth) || 0;
					const borderTop = parseFloat(aStyle.borderTopWidth) || 0;
					const clipLeft = aRect.left + borderLeft;
					const clipRight = clipLeft + ancestor.clientWidth;
					const clipTop = aRect.top + borderTop;
					const clipBottom = clipTop + ancestor.clientHeight;

					const clippedSides: string[] = [];
					if (clipsX && outlineRect.left < clipLeft - 0.5) clippedSides.push('left');
					if (clipsX && outlineRect.right > clipRight + 0.5) clippedSides.push('right');
					if (clipsY && outlineRect.top < clipTop - 0.5) clippedSides.push('top');
					if (clipsY && outlineRect.bottom > clipBottom + 0.5) clippedSides.push('bottom');

					clippingAncestors.push({
						tag: ancestor.tagName.toLowerCase(),
						className: typeof ancestor.className === 'string' ? ancestor.className : '',
						overflowX: aStyle.overflowX,
						overflowY: aStyle.overflowY,
						clipsX,
						clipsY,
						clipLeft,
						clipRight,
						clipTop,
						clipBottom,
						clippedSides,
					});
				}
			}
			ancestor = ancestor.parentElement;
		}

		return {
			outlineWidth,
			outlineOffset,
			outlineStyle: style.outlineStyle,
			outlineRect,
			clippingAncestors,
		};
	});
}

/**
 * Measures the visible focus outline on a focused control (including outline-width
 * and outline-offset) and asserts that it fits inside every clipping ancestor.
 */
async function expectFocusOutlineNotClipped(controlRoot: Locator): Promise<void> {
	let report: OutlineClippingReport | null = null;
	await expect
		.poll(async () => {
			report = await measureFocusOutline(controlRoot);
			return report;
		})
		.not.toBeNull();

	expect(report).not.toBeNull();
	expect(report!.outlineWidth).toBeGreaterThan(0);
	expect(report!.clippingAncestors.some((ancestor) => ancestor.clipsX)).toBe(true);

	const clipped = report!.clippingAncestors.filter((ancestor) => ancestor.clippedSides.length > 0);
	expect(
		clipped,
		`Focus outline ${JSON.stringify(report!.outlineRect)} (width=${report!.outlineWidth}px, offset=${report!.outlineOffset}px) was clipped by: ${JSON.stringify(clipped)}`,
	).toEqual([]);
}

// KNO-271: Focus rings inside project primitive filter popovers must not be clipped by the scroll viewport.
test.describe(
	'KNO-271: Filter popover focus outline visibility',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test('keeps the full focus outline visible on Credentials Type filter', async ({
			n8n,
			api,
		}) => {
			const personalProject = await api.projects.getMyPersonalProject();
			await api.credentials.createCredentialFromDefinition({
				name: `Header Auth ${nanoid(6)}`,
				type: 'httpHeaderAuth',
				data: {
					name: 'Authorization',
					value: 'Bearer test-token',
				},
			});

			await n8n.navigate.toCredentials(personalProject.id);
			await expect(n8n.credentials.getFiltersTrigger()).toBeVisible();

			await openPopoverAndFocusWithKeyboard(
				n8n.page,
				n8n.credentials.getFiltersTrigger(),
				n8n.credentials.getFiltersDropdown(),
				n8n.credentials.getTypeFilterCombobox(),
			);

			await expectFocusOutlineNotClipped(n8n.credentials.getTypeFilterSelect());
		});

		test('keeps the full focus outline visible on Executions Status filter', async ({
			n8n,
			api,
		}) => {
			const personalProject = await api.projects.getMyPersonalProject();
			await api.workflows.createWorkflowFromDefinition({
				name: `Executions filter focus ${nanoid(6)}`,
				nodes: [
					{
						id: nanoid(),
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			await n8n.navigate.toProjectExecutions(personalProject.id);
			await expect(n8n.executions.getFilterButton()).toBeVisible();

			await openPopoverAndFocusWithKeyboard(
				n8n.page,
				n8n.executions.getFilterButton(),
				n8n.executions.getFilterForm(),
				n8n.executions.getStatusSelectCombobox(),
			);

			await expectFocusOutlineNotClipped(n8n.executions.getStatusSelect());
		});
	},
);
