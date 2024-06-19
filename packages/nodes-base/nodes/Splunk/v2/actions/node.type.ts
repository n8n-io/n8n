import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	firedAlert: 'getReport';
	searchConfiguration: 'deleteConfiguration' | 'get' | 'getAll';
	searchJob: 'create' | 'deleteJob' | 'get' | 'getAll';
	searchResult: 'getAll';
	user: 'create' | 'deleteUser' | 'get' | 'getAll' | 'update';
};

export type SplunkType = AllEntities<NodeMap>;
