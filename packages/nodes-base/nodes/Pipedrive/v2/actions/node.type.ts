import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	activity: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	deal: 'create' | 'delete' | 'duplicate' | 'get' | 'getAll' | 'search' | 'update';
	dealProduct: 'add' | 'getAll' | 'remove' | 'update';
	file: 'create' | 'delete' | 'download' | 'get' | 'update';
	lead: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	note: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	organization: 'create' | 'delete' | 'get' | 'getAll' | 'search' | 'update';
	person: 'create' | 'delete' | 'get' | 'getAll' | 'search' | 'update';
	product: 'create' | 'delete' | 'get' | 'getAll' | 'search' | 'update';
};

export type PipedriveType = AllEntities<NodeMap>;
