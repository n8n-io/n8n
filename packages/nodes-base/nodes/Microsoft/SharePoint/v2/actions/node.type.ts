import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	file: 'download' | 'update' | 'upload';
	list: 'get' | 'getAll';
	item: 'create' | 'get' | 'getAll' | 'delete' | 'update' | 'upsert';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
