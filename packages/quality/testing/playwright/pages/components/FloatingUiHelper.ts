import type { Locator, Page } from '@playwright/test';

type GetByRoleName = NonNullable<Parameters<Locator['getByRole']>[1]>['name'];
type GetByRoleOptionsWithoutName = Omit<Parameters<Locator['getByRole']>[1], 'name'>;

export class FloatingUiHelper {
	constructor(protected readonly page: Page) {}

	getVisiblePoppers() {
		// Match Reka UI popovers (data-side is unique to Reka UI positioned content)
		return this.page.locator('[data-state="open"][data-side]');
	}

	getVisiblePopper() {
		// Match both Element+ poppers (.el-popper:visible) and Reka UI poppers ([data-state="open"])
		return this.page.locator(
			'.el-popper:visible, [data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]',
		);
	}

	/** Tooltip content is teleported out of its trigger, so scope it to the page. */
	getTooltip() {
		return this.page.getByTestId('tooltip-content').filter({ visible: true });
	}

	getTooltipOrderedList() {
		return this.getTooltip().locator('.titled-list-item > ol').first();
	}

	async getTooltipOrderedListMarkerBounds() {
		const client = await this.page.context().newCDPSession(this.page);
		try {
			const { root }: { root: { nodeId: number } } = await client.send('DOM.getDocument');
			const { nodeId }: { nodeId: number } = await client.send('DOM.querySelector', {
				nodeId: root.nodeId,
				selector: '[data-test-id="tooltip-content"] .titled-list-item > ol',
			});
			const {
				node,
			}: {
				node: {
					children?: Array<{
						pseudoElements?: Array<{ backendNodeId: number; pseudoType?: string }>;
					}>;
				};
			} = await client.send('DOM.describeNode', { nodeId, depth: 1 });
			const markers = (node.children ?? []).flatMap((item) =>
				(item.pseudoElements ?? []).filter((pseudo) => pseudo.pseudoType === 'marker'),
			);

			// List-item bounds exclude outside markers. Read the rendered marker boxes instead.
			return await Promise.all(
				markers.map(async (marker) => {
					const { model }: { model: { border: number[] } } = await client.send('DOM.getBoxModel', {
						backendNodeId: marker.backendNodeId,
					});
					return {
						left: Math.min(model.border[0], model.border[2], model.border[4], model.border[6]),
						right: Math.max(model.border[0], model.border[2], model.border[4], model.border[6]),
						top: Math.min(model.border[1], model.border[3], model.border[5], model.border[7]),
						bottom: Math.max(model.border[1], model.border[3], model.border[5], model.border[7]),
					};
				}),
			);
		} finally {
			await client.detach();
		}
	}

	getVisiblePopoverMenuItem(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.getVisiblePopper()
			.getByRole('menuitem', { name, ...options })
			.filter({ visible: true });
	}

	getVisiblePopoverOption(name?: GetByRoleName, options: GetByRoleOptionsWithoutName = {}) {
		return this.getVisiblePopper()
			.getByRole('option', { name, ...options })
			.filter({ visible: true });
	}
}
