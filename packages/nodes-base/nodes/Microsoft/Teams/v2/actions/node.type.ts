import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	channel: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	channelMessage: 'create' | 'get' | 'getAll' | 'getAllReplies' | 'reply';
	chatMember: 'add' | 'getAll';
	chatMessage: 'create' | 'get' | 'getAll' | 'sendAndWait' | 'softDeleteMessage';
	onlineMeeting: 'create' | 'createOrGet' | 'deleteMeeting' | 'get' | 'update';
	task: 'create' | 'deleteTask' | 'get' | 'getAll' | 'update';
};

export type MicrosoftTeamsType = AllEntities<NodeMap>;
