import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	channel: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	channelMessage: 'create' | 'get' | 'getAll' | 'getAllReplies' | 'reply';
	chatMessage: 'create' | 'get' | 'getAll' | 'sendAndWait';
	onlineMeeting: 'create' | 'createOrGet' | 'deleteMeeting' | 'get' | 'update';
	task: 'create' | 'deleteTask' | 'get' | 'getAll' | 'update';
};

export type MicrosoftTeamsType = AllEntities<NodeMap>;
