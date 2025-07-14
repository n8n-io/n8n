import type { IDataObject } from 'n8n-workflow';

export interface ITrack {
	event?: string;
	userId?: string;
	name?: string;
	anonymousId?: string;
	traits?: IDataObject;
	context?: IDataObject;
	timestamp?: string;
	properties?: IDataObject;
	integrations?: IDataObject;
}

export interface IGroup extends ITrack {
	groupId: string;
}
