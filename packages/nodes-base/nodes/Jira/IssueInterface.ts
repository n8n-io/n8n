import { IDataObject } from "n8n-workflow";

export interface IFields {
	summary?: string;
	project?: IDataObject;
	issuetype?: IDataObject;
	labels?: string[];
	priority?: IDataObject;
	assignee?: IDataObject;
	description?: string;
	parent?: IDataObject;
}

export interface IIssue {
	fields?: IFields;
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
