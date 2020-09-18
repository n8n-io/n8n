export interface ITweet {
	display_coordinates?: boolean;
	lat?: number;
	long?: number;
	media_ids?: string;
	possibly_sensitive?: boolean;
	status: string;
	in_reply_to_status_id?: string;
}
