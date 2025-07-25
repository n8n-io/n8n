export interface IPost {
	author?: number;
	id?: number;
	title?: string;
	content?: string;
	slug?: string;
	excerpt?: string;
	password?: string;
	status?: string;
	date?: string;
	comment_status?: string;
	ping_status?: string;
	format?: string;
	sticky?: boolean;
	template?: string;
	categories?: number[];
	tags?: number[];
	featured_media?: number;
}
