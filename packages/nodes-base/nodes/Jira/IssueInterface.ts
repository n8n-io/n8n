import { IDataObject } from "n8n-workflow";

export interface IFields {
	summary: string;
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
