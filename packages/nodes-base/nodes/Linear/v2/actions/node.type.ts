import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	issue: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive' | 'unarchive' | 'search';
	comment: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	project: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive';
	user: 'get' | 'getAll' | 'getCurrent';
	team: 'get' | 'getAll';
	label: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	cycle: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive';
	attachment: 'create' | 'get' | 'getAll' | 'delete';
	workflowState: 'get' | 'getAll';
	document: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	roadmap: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	teamMembership: 'create' | 'getAll' | 'delete';
};

export type Linear = AllEntities<NodeMap>;
