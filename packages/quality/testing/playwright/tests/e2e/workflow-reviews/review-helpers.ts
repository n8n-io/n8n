import { nanoid } from 'nanoid';

import { expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

/** Approval publishes the workflow, so it needs a trigger that can be activated. */
export function scheduleTriggerNode() {
	return {
		id: nanoid(),
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0] as [number, number],
		parameters: { rule: { interval: [{ field: 'days' }] } },
	};
}

/**
 * The reviews module is only started at boot, and only if the license allows it,
 * so `enableFeature` alone cannot switch it on. Check it up front to fail with a
 * clear reason instead of a 404 halfway through the flow.
 */
export async function assertReviewsModuleActive(api: ApiHelpers): Promise<void> {
	expect(
		await api.getActiveModules(),
		'the workflow-reviews module is not active: the instance needs a license granting feat:workflowReviews at startup',
	).toContain('workflow-reviews');
}
