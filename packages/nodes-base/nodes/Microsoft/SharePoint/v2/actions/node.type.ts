import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	file: 'download' | 'update' | 'upload';
	list: 'get' | 'getAll';
	item: 'create' | 'get' | 'getAll' | 'delete' | 'update';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
