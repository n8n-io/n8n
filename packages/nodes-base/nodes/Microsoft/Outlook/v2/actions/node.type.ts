import { AllEntities, Entity } from 'n8n-workflow';

type MicrosoftOutlookMap = {
	calendar: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	contact: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	draft: 'create' | 'delete' | 'get' | 'send' | 'update';
	event: 'create' | 'delete' | 'get' | 'getAll' | 'update';
	folder: 'create' | 'delete' | 'get' | 'getChildren' | 'getAll' | 'update';
	folderMessage: 'getAll';
	message: 'delete' | 'get' | 'getAll' | 'move' | 'update' | 'send' | 'reply';
	messageAttachment: 'add' | 'download' | 'getAll' | 'get';
};

export type MicrosoftOutlook = AllEntities<MicrosoftOutlookMap>;

export type MicrosoftOutlookCalendar = Entity<MicrosoftOutlookMap, 'calendar'>;
export type MicrosoftOutlookContact = Entity<MicrosoftOutlookMap, 'contact'>;
export type MicrosoftOutlookDraft = Entity<MicrosoftOutlookMap, 'draft'>;
export type MicrosoftOutlookEvent = Entity<MicrosoftOutlookMap, 'event'>;
export type MicrosoftOutlookFolder = Entity<MicrosoftOutlookMap, 'folder'>;
export type MicrosoftOutlookFolderMessage = Entity<MicrosoftOutlookMap, 'folderMessage'>;
export type MicrosoftOutlookMessage = Entity<MicrosoftOutlookMap, 'message'>;
export type MicrosoftOutlookMessageAttachment = Entity<MicrosoftOutlookMap, 'messageAttachment'>;
