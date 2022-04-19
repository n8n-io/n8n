
interface EventBody {
	photo?: [
		{
			file_id: string,
		},
	];
	document?: {
		file_id: string;
	};
}

export interface IEvent {
	message?: EventBody;
	channel_post?: EventBody;
	download_link?: string;
}
