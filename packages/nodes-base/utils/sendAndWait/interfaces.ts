import type { IDataObject } from 'n8n-workflow';

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

/**
 * Identity of the person who responded to a Send and Wait approval, captured
 * from the platform's callback payload. App-agnostic so every HITL-capable
 * node (Telegram, Slack, Discord, WhatsApp) can populate the same shape.
 */
export interface SendAndWaitResponder {
	/** Platform-native user id (e.g. Telegram numeric user id as a string). */
	id: string;
	/** Display name, where the platform exposes it. */
	name?: string;
	/** Platform username/handle, where the platform exposes it (e.g. Telegram @username). */
	username?: string;
	/** Email, where the platform exposes it (e.g. Slack). */
	email?: string;
	source: 'slack' | 'telegram' | 'discord' | 'whatsapp';
}
