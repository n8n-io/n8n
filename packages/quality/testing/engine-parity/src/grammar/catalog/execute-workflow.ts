import fc from 'fast-check';

import type { CatalogEntry } from './types';

/**
 * Calls a generated sub-workflow from the database, once for all items. Engine
 * v2 refuses the "each item" mode and sub-workflows that are not in the database.
 */
export const executeWorkflow: CatalogEntry = {
	id: 'executeWorkflow',
	type: 'n8n-nodes-base.executeWorkflow',
	version: 1,
	role: 'subWorkflow',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: () =>
		fc.constant({
			source: 'database',
			workflowId: { $subWorkflowId: true },
			mode: 'once',
			options: {},
		}),
};
