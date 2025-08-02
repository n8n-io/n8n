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
