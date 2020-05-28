import {
	IDataObject,
 } from 'n8n-workflow';

export interface IPrivacy {
	facebook?: IDataObject;
	linkedIn?: IDataObject;
}

export interface ILocation {
	latitude?: number;
	longitude?: number;
}

export interface IVideoOptions {
	[index: string]: any;
}

export interface IMedia {
	id?: string;
	videoOptions?: IVideoOptions;
}

export interface IMessageSchedule {
	text: string;
	socialProfileIds: string[];
	emailNotification?: boolean;
	privacy?: IPrivacy;
	location?: ILocation;
	mediaUrls?: string[];
	media?: IMedia[];
	scheduledSendTime?: string;
	tags?: string[];
	webhookUrls?: string[];
}
