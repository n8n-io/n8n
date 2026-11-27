import type { Locator } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

/**
 * Returns the horizontal distance in pixels between the nearest visible left
 * edge enclosing the input (a left border or a background color boundary) and
 * the start of the input's text content (placeholder and entered text).
 */
async function getInputLeftTextInset(input: Locator): Promise<number> {
	return await input.evaluate((element) => {
		const isTransparent = (color: string): boolean =>
			color === '' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';

		const getEffectiveBackground = (start: Element | null): string => {
			let node = start;
			while (node) {
				const bg = getComputedStyle(node).backgroundColor;
				if (!isTransparent(bg)) return bg;
				node = node.parentElement;
			}
			return '';
		};

		const hasVisibleLeftEdge = (node: Element): boolean => {
			const style = getComputedStyle(node);
			const hasLeftBorder =
				parseFloat(style.borderLeftWidth) > 0 &&
				style.borderLeftStyle !== 'none' &&
				!isTransparent(style.borderLeftColor);
			if (hasLeftBorder) return true;

			const bg = style.backgroundColor;
			return !isTransparent(bg) && bg !== getEffectiveBackground(node.parentElement);
		};

		const inputStyle = getComputedStyle(element);
		const inputRect = element.getBoundingClientRect();
		const textStartX =
			inputRect.left + parseFloat(inputStyle.borderLeftWidth) + parseFloat(inputStyle.paddingLeft);

		let boundary: Element = element;
		let current: Element | null = element;
		while (current && current !== document.body) {
			if (hasVisibleLeftEdge(current)) {
				boundary = current;
				break;
			}
			current = current.parentElement;
		}

		return textStartX - boundary.getBoundingClientRect().left;
	});
}

// LIGO-1544: The Latest field under Execution start must keep left spacing before
// its placeholder and entered text instead of sitting flush against the field's left edge.
test.describe(
	'LIGO-1544: Execution filter Latest field spacing',
	{
		annotation: [
			{ type: 'owner', description: 'Lifecycle & Governance' },
			{ type: 'issue', description: 'LIGO-1544' },
		],
	},
	() => {
		test.describe('global executions', () => {
			test.beforeEach(async ({ n8n, api }) => {
				// Use dark mode, where the input surface contrasts with the popover and exposes
				// a missing left inset at the field edge.
				await n8n.page.emulateMedia({ colorScheme: 'dark' });

				const personalProject = await api.projects.getMyPersonalProject();
				// The executions list shows its filter only when the project has a workflow.
				await api.workflows.createWorkflow({
					name: `Executions filter ${nanoid(6)}`,
					nodes: [],
					connections: {},
				});

				await n8n.navigate.toProjectExecutions(personalProject.id);
				await n8n.executions.openFilter();
				await expect(n8n.executions.getFilterForm()).toBeVisible();
			});

			test('keeps left spacing in the Earliest field for placeholder and entered text', async ({
				n8n,
			}) => {
				const earliestInput = n8n.executions.getFilterStartDateInput();
				await expect(earliestInput).toBeVisible();

				expect(
					await getInputLeftTextInset(earliestInput),
					'Earliest placeholder must have left spacing inside the field',
				).toBeGreaterThan(0);

				await earliestInput.fill('123');
				await expect(earliestInput).toHaveValue('123');

				expect(
					await getInputLeftTextInset(earliestInput),
					'Entered text in Earliest must have left spacing inside the field',
				).toBeGreaterThan(0);
			});

			test('keeps left spacing in the Latest field for placeholder and entered text', async ({
				n8n,
			}) => {
				const latestInput = n8n.executions.getFilterEndDateInput();
				await expect(latestInput).toBeVisible();

				expect
					.soft(
						await getInputLeftTextInset(latestInput),
						'Latest placeholder must have left spacing inside the field',
					)
					.toBeGreaterThan(0);

				await latestInput.fill('123');
				await expect(latestInput).toHaveValue('123');

				expect
					.soft(
						await getInputLeftTextInset(latestInput),
						'Entered text in Latest must have left spacing inside the field',
					)
					.toBeGreaterThan(0);
			});
		});

		test('keeps left spacing in the Latest field in the workflow executions sidebar', async ({
			n8n,
			api,
		}) => {
			await n8n.page.emulateMedia({ colorScheme: 'dark' });

			const workflow = await api.workflows.createWorkflow({
				name: `Workflow executions filter ${nanoid(6)}`,
				nodes: [],
				connections: {},
			});

			await n8n.navigate.toWorkflow(workflow.id);
			await n8n.canvas.clickExecutionsTab();
			await expect(n8n.executions.getExecutionsSidebar()).toBeVisible();

			await n8n.executions.openFilter();
			await expect(n8n.executions.getFilterForm()).toBeVisible();

			const latestInput = n8n.executions.getFilterEndDateInput();
			await expect(latestInput).toBeVisible();

			expect(
				await getInputLeftTextInset(latestInput),
				'Latest placeholder must have left spacing inside the field',
			).toBeGreaterThan(0);

			await latestInput.fill('2026-11-26 12:00');
			await expect(latestInput).toHaveValue('2026-11-26 12:00');

			expect(
				await getInputLeftTextInset(latestInput),
				'Entered datetime text in Latest must have left spacing inside the field',
			).toBeGreaterThan(0);
		});
	},
);
