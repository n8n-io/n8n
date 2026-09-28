interface EventBody {
	message_id?: number;
	text?: string;
	photo?: [
		{
			file_id: string;
		},
	];
	document?: {
		file_id: string;
	};
	video?: {
		file_id: string;
	};
	chat?: {
		id: number;
	};
	from?: {
		id: number;
	};
}

export interface CallbackQuery {
	id?: string;
	data?: string;
	from?: {
		id: number;
		username?: string;
		first_name?: string;
		last_name?: string;
	};
	message?: EventBody;
}

interface QueryWithFrom {
	from?: {
		id: number;
	};
}

export interface IEvent {
	message?: EventBody;
	edited_message?: EventBody;
	channel_post?: EventBody;
	edited_channel_post?: EventBody;
	callback_query?: CallbackQuery;
	inline_query?: QueryWithFrom;
	pre_checkout_query?: QueryWithFrom;
	shipping_query?: QueryWithFrom;
	poll?: Record<string, unknown>;
	download_link?: string;
}
