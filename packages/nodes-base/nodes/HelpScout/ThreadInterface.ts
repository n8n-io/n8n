import { IDataObject } from 'n8n-workflow';

export interface IAttachment {
	fileName?: string;
	mimeType?: string;
	data?: string;
}

export interface IThread {
	createdAt?: string;
	customer?: IDataObject;
	imported?: boolean;
	text?: string;
	attachments?: IAttachment[];
}
