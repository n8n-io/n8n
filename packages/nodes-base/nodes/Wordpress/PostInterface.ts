
export interface IPost {
	id?: number;
	title?: string;
	content?: string;
	slug?: string;
	password?: string;
	status?: string;
	comment_status?: string;
	ping_status?: string;
	format?: string;
	sticky?: boolean;
	categories?: number[];
	tags?: number[];
}
