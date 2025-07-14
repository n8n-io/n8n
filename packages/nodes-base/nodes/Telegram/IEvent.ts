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

export interface IEvent {
	message?: EventBody;
	channel_post?: EventBody;
	download_link?: string;
}
