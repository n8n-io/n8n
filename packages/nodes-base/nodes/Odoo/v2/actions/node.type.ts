import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	custom: 'create' | 'delete' | 'get' | 'getAll' | 'update' | 'executeMethod';
};

export type OdooV2 = AllEntities<NodeMap>;
