import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	alert:
		| 'count'
		| 'create'
		| 'executeResponder'
		| 'get'
		| 'getAll'
		| 'markAsRead'
		| 'markAsUnread'
		| 'merge'
		| 'promote'
		| 'update';
	case: 'count' | 'create' | 'executeResponder' | 'get' | 'getAll' | 'update';
	log: 'create' | 'executeResponder' | 'get' | 'getAll';
	observable:
		| 'count'
		| 'create'
		| 'executeAnalyzer'
		| 'executeResponder'
		| 'get'
		| 'getAll'
		| 'search'
		| 'update';
	task: 'count' | 'create' | 'executeResponder' | 'get' | 'getAll' | 'search' | 'update';
};

export type TheHiveType = AllEntities<NodeMap>;
