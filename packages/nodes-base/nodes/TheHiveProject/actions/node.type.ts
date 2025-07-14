import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	alert:
		| 'create'
		| 'deleteAlert'
		| 'executeResponder'
		| 'get'
		| 'search'
		| 'status'
		| 'merge'
		| 'promote'
		| 'update';
	case:
		| 'addAttachment'
		| 'create'
		| 'deleteAttachment'
		| 'deleteCase'
		| 'executeResponder'
		| 'get'
		| 'search'
		| 'getAttachment'
		| 'getTimeline'
		| 'update';
	comment: 'add' | 'deleteComment' | 'search' | 'update';
	log:
		| 'addAttachment'
		| 'create'
		| 'deleteLog'
		| 'deleteAttachment'
		| 'executeResponder'
		| 'get'
		| 'search';
	observable:
		| 'create'
		| 'deleteObservable'
		| 'executeAnalyzer'
		| 'executeResponder'
		| 'get'
		| 'search'
		| 'update';
	page: 'create' | 'deletePage' | 'search' | 'update';
	query: 'executeQuery';
	task: 'create' | 'deleteTask' | 'executeResponder' | 'get' | 'search' | 'update';
};

export type TheHiveType = AllEntities<NodeMap>;
