import fc from 'fast-check';

import type { CatalogEntry } from './types';

/** The runners give the trigger items to the fired trigger. It runs no logic of its own. */
export const manualTrigger: CatalogEntry = {
	id: 'trigger.manual',
	type: 'n8n-nodes-base.manualTrigger',
	version: 1,
	role: 'trigger',
	inputs: 0,
	outputs: 1,
	deterministic: true,
	params: () => fc.constant({}),
};

/** The trigger of a sub-workflow. Version 1 passes the items of the caller through. */
export const executeWorkflowTrigger: CatalogEntry = {
	id: 'trigger.executeWorkflow',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	version: 1,
	role: 'trigger',
	inputs: 0,
	outputs: 1,
	deterministic: true,
	params: () => fc.constant({}),
};
