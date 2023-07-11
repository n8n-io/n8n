import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	alert:
		| 'count'
		| 'create'
		| 'executeResponder'
		| 'get'
		| 'search'
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
		| 'search'
		| 'getAttachment'
		| 'getTimeline'
		| 'update';
	comment: 'add' | 'deleteComment' | 'update';
	log: 'addAttachment' | 'create' | 'deleteAttachment' | 'executeResponder' | 'get' | 'search';
	observable:
		| 'count'
		| 'create'
		| 'executeAnalyzer'
		| 'executeResponder'
		| 'get'
		| 'search'
		| 'update';
	page: 'create' | 'deletePage' | 'update';
	query: 'executeQuery';
	task: 'count' | 'create' | 'executeResponder' | 'get' | 'search' | 'update';
};

export type TheHiveType = AllEntities<NodeMap>;
