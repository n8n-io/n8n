export interface IPost {
	author?: number;
	id?: number;
	title?: string;
	content?: string;
	slug?: string;
	password?: string;
	status?: string;
	excerpt?: string;
	featured_media?: number;
	comment_status?: string;
	ping_status?: string;
	format?: string;
	sticky?: boolean;
	template?: string;
	categories?: number[];
	tags?: number[];
}
