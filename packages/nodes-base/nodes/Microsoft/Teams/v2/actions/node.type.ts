import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	channel: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	channelMessage:
		| 'create'
		| 'get'
		| 'getAll'
		| 'getAllReplies'
		| 'reply'
		| 'softDeleteMessage'
		| 'undoSoftDeleteMessage';
	chat: 'create' | 'get' | 'getAll';
	chatMember: 'add' | 'getAll' | 'remove';
	chatMessage:
		| 'create'
		| 'get'
		| 'getAll'
		| 'sendAndWait'
		| 'softDeleteMessage'
		| 'undoSoftDeleteMessage';
	onlineMeeting: 'create' | 'createOrGet' | 'deleteMeeting' | 'get' | 'update';
	task: 'create' | 'deleteTask' | 'get' | 'getAll' | 'update';
};

export type MicrosoftTeamsType = AllEntities<NodeMap>;
