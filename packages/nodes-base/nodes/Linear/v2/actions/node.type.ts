import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	issue: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive' | 'unarchive' | 'search';
	comment: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	customer: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	customerNeed: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	project: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive';
	user: 'get' | 'getAll' | 'getCurrent';
	team: 'get' | 'getAll';
	label: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	cycle: 'create' | 'get' | 'getAll' | 'update' | 'archive';
	attachment: 'create' | 'get' | 'getAll' | 'delete';
	workflowState: 'get' | 'getAll';
	document: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	initiative: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive';
	projectMilestone: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	projectUpdate: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	release: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	view: 'create' | 'get' | 'getAll' | 'update' | 'delete';
	issueRelation: 'create' | 'getAll' | 'delete';
	teamMembership: 'create' | 'getAll' | 'delete';
};

export type Linear = AllEntities<NodeMap>;
