export interface IEvent {
	message?: {
		photo?: [
			{
				file_id: string,
			},
		],
		document?: {
			file_id: string;
		},
	};
}
