import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	file: 'download' | 'update' | 'upload';
	list: 'get';
};

export type MicrosoftSharePointType = AllEntities<NodeMap>;
