interface EventBody {
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

interface CallbackQuery {
	from?: {
		id: number;
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
	channel_post?: EventBody;
	callback_query?: CallbackQuery;
	edited_message?: EventBody;
	edited_channel_post?: EventBody;
	inline_query?: QueryWithFrom;
	pre_checkout_query?: QueryWithFrom;
	shipping_query?: QueryWithFrom;
	download_link?: string;
}
