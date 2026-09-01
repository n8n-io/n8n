import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	channel: 'create' | 'deleteChannel' | 'get' | 'getAll' | 'update';
	channelMessage: 'create' | 'get' | 'getAll' | 'reply';
	chatMessage: 'create' | 'get' | 'getAll' | 'sendAndWait';
	onlineMeeting: 'create';
	task: 'create' | 'deleteTask' | 'get' | 'getAll' | 'update';
};

export type MicrosoftTeamsType = AllEntities<NodeMap>;
