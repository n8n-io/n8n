import type { IDataObject } from 'n8n-workflow';

export interface SubscriberEntity extends IDataObject {
	id?: string;
	name?: string;
	email?: string;
}
