import type { IDataObject } from 'n8n-workflow';

/**
 * Identity of the person who responded to a Send-and-Wait request from within the
 * messaging app itself (currently only a Slack button click).
 */
export interface SendAndWaitResponder {
	id: string;
	name?: string;
	email?: string;
	source: 'slack';
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
