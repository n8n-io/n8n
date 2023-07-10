import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	alert:
		| 'count'
		| 'create'
		| 'executeResponder'
		| 'get'
		| 'getMany'
		| 'status'
		| 'merge'
		| 'promote'
		| 'update';
	case:
		| 'addAttachment'
		| 'count'
		| 'create'
		| 'deleteAttachment'
		| 'executeResponder'
		| 'get'
		| 'getMany'
		| 'getAttachment'
		| 'getTimeline'
		| 'update';
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
	query: 'executeQuery';
	task: 'count' | 'create' | 'executeResponder' | 'get' | 'search' | 'update';
};

export type TheHiveType = AllEntities<NodeMap>;
