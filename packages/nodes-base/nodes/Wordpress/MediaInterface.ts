export interface IMedia {
	id?: number;
	date?: string;
	date_gmt?: string;
	guid?: object;
	modified?: string;
	modified_gmt?: string;
	slug?: string;
	status?: string;
	type?: string;
	link?: string;
	title?: object | string;
	author?: number;
	comment_status?: string;
	ping_status?: string;
	template?: string;
	meta?: object;
	description?: object | string;
	caption?: object | string;
	alt_text?: string;
	media_type?: string;
	mime_type?: string;
	media_details?: object;
	post?: number;
	source_url?: string;
}
