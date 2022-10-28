import { AllEntities, Entity } from 'n8n-workflow';

type MicrosoftOutlookMap = {
	draft: 'create' | 'delete' | 'get' | 'send' | 'update';
	folder: 'create' | 'delete' | 'get' | 'getChildren' | 'getAll' | 'update';
	message: 'delete' | 'get' | 'getAll' | 'update' | 'send' | 'reply';
	messageAttachment: 'add' | 'download' | 'getAll' | 'get';
};

export type MicrosoftOutlook = AllEntities<MicrosoftOutlookMap>;

export type MicrosoftOutlookDraft = Entity<MicrosoftOutlookMap, 'draft'>;
export type MicrosoftOutlookFolder = Entity<MicrosoftOutlookMap, 'folder'>;
export type MicrosoftOutlookMessage = Entity<MicrosoftOutlookMap, 'message'>;
export type MicrosoftOutlookMessageAttachment = Entity<MicrosoftOutlookMap, 'messageAttachment'>;
