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
 * Identity of the person who responded to a Send-and-Wait / HITL step, captured
 * from the responding app (e.g. Slack) and surfaced on the resumed node output.
 * App-agnostic so each integration (Slack, Telegram, Discord, …) can populate it.
 */
export interface SendAndWaitResponder {
	/** App-native user id (e.g. Slack "U123"). */
	id: string;
	/** Display name / real name, where the app exposes it. */
	name?: string;
	/** Email, where the app exposes it (Slack, Discord). */
	email?: string;
	/** Which integration captured the identity, for downstream/audit use. */
	source: 'slack' | 'telegram' | 'discord' | 'whatsapp';
}
