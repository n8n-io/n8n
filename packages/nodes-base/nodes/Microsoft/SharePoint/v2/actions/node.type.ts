import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	file: 'download' | 'update' | 'upload';
	list: 'get' | 'getAll';
	item: 'get' | 'delete';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
