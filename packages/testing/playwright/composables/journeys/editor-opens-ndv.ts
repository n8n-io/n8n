import { expect } from '@playwright/test';

import { MANUAL_TRIGGER_NODE_NAME } from '../../config/constants';
import type { A11yGate } from '../../fixtures/a11y';
import type { n8nPage } from '../../pages/n8nPage';

/**
 * Journey: an editor opens a node in the details view from a blank canvas.
 * A11y checkpoints run at the real interaction points - after the canvas has
 * loaded and after the NDV has opened - so each scan sees the surface the
 * journey just exercised, with reports and any budget enforcement handled by
 * the gate.
 */
export async function editorOpensNdv(deps: { n8n: n8nPage; a11yGate: A11yGate }): Promise<void> {
	await deps.n8n.start.fromBlankCanvas();
	await deps.a11yGate.checkpoint('canvas');

	await deps.n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
	const canvasNodes = deps.n8n.canvas.getCanvasNodes();
	await canvasNodes.first().dblclick();
	await expect(deps.n8n.ndv.container).toBeVisible();
	await deps.a11yGate.checkpoint('ndv');
}
