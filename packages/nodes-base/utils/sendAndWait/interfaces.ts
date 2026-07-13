import type { IDataObject } from 'n8n-workflow';

/**
 * Identity of the person who responded to a Send-and-Wait request from within the
 * messaging app itself (e.g. a Slack button click). Kept app-agnostic so Telegram
 * and Gmail can reuse it as their advanced HITL support lands.
 */
export interface SendAndWaitResponder {
	id: string;
	name?: string;
	email?: string;
	source: 'slack' | 'telegram' | 'discord' | 'whatsapp';
}

export interface IEmail {
	from?: string;
	to?: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
	inReplyTo?: string;
	reference?: string;
	references?: string;
	subject: string;
	body: string;
	htmlBody?: string;
	attachments?: IDataObject[];
}
