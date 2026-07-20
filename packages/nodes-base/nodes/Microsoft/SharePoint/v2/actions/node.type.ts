import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	file: 'upload';
	list: 'get' | 'getAll';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
