import {
	IDataObject,
 } from 'n8n-workflow';

 export interface IComment {
	body?: string;
}

export interface ITicket {
	subject?: string;
	comment?: IComment;
	type?: string;
	group?: string;
	external_id?: string;
	tags?: string[];
	status?: string;
	recipient?: string;
	custom_fields?: IDataObject[];
}
