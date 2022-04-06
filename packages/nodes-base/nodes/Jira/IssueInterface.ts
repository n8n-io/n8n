import {
	IDataObject,
} from 'n8n-workflow';

export interface IFields {
	assignee?: IDataObject;
	description?: string;
	issuetype?: IDataObject;
	labels?: string[];
	parent?: IDataObject;
	priority?: IDataObject;
	project?: IDataObject;
	summary?: string;
	reporter?: IDataObject;
	components?: IDataObject[];
}

export interface IIssue {
	fields?: IFields;
	transition?: IDataObject;
}

export interface INotify {
	subject?: string;
	textBody?: string;
	htmlBody?: string;
	to?: INotificationRecipients;
	restrict?: NotificationRecipientsRestrictions;
}

export interface INotificationRecipients {
	reporter?: boolean;
	assignee?: boolean;
	watchers?: boolean;
	voters?: boolean;
	users?: IDataObject[];
	groups?: IDataObject[];
}

export interface NotificationRecipientsRestrictions {
	groups?: IDataObject[];
}
