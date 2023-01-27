import type { IDataObject } from 'n8n-workflow';

export interface IConversation {
	assignTo?: number;
	autoReply?: boolean;
	closedAt?: string;
	createdAt?: string;
	customer?: IDataObject;
	fields?: IDataObject[];
	imported?: boolean;
	mailboxId?: number;
	status?: string;
	subject?: string;
	tag?: IDataObject[];
	tags?: IDataObject[];
	threads?: IDataObject[];
	type?: string;
	user?: number;
}
