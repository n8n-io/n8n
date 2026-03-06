import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	issue: 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'archive' | 'unarchive' | 'search';
	comment: 'create' | 'get' | 'getAll' | 'update' | 'delete';
};

export type Linear = AllEntities<NodeMap>;
