import type { IDataObject } from 'n8n-workflow';

export interface IEvent {
	event_name?: string;
	external_id?: string;
	anonymous_id?: string;
	context?: IDataObject;
	timestamp?: string;
	sent_at: number;
	source: string;
	api_version: string;
}
