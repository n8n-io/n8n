import type { IDataObject } from 'n8n-workflow';

export interface IIdentify {
	address?: IDataObject;
	anonymous_id?: string;
	api_version: string;
	context?: IDataObject;
	email?: string;
	external_id?: string;
	first_name?: string;
	last_name?: string;
	phone?: string;
	sent_at: number;
}
