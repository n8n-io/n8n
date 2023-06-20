import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	alert:
		| 'count'
		| 'create'
		| 'executeResponder'
		| 'get'
		| 'getMany'
		| 'markAsRead'
		| 'markAsUnread'
		| 'merge'
		| 'promote'
		| 'update';
	case: 'count' | 'create' | 'executeResponder' | 'get' | 'getMany' | 'getTimeline' | 'update';
	comment: 'add' | 'deleteComment' | 'update';
	log: 'create' | 'executeResponder' | 'get' | 'getMany';
	observable:
		| 'count'
		| 'create'
		| 'executeAnalyzer'
		| 'executeResponder'
		| 'get'
		| 'getMany'
		| 'search'
		| 'update';
	page: 'create' | 'deletePage' | 'update';
	task: 'count' | 'create' | 'executeResponder' | 'get' | 'getMany' | 'search' | 'update';
};

export type TheHiveType = AllEntities<NodeMap>;
