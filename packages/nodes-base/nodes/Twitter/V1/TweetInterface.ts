import type { IDataObject } from 'n8n-workflow';

export interface ITweet {
	auto_populate_reply_metadata?: boolean;
	display_coordinates?: boolean;
	lat?: number;
	long?: number;
	media_ids?: string;
	possibly_sensitive?: boolean;
	status: string;
	in_reply_to_status_id?: string;
}

export interface ITweetCreate {
	type: 'message_create';
	message_create: {
		target: {
			recipient_id: string;
		};
		message_data: {
			text: string;
			attachment?: IDataObject;
		};
	};
}
