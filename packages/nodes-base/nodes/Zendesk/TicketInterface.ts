export interface ITicket {
	subject?: string;
	comment?: IComment;
	type?: string;
	group?: string;
	external_id?: string;
	tags?: string[];
	status?: string;
	recipient?: string;
}

export interface IComment {
	body?: string;
}
