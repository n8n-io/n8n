export interface ICallToAction {
	actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL' | 'NONE';
	url: string;
}

export interface IMediaItem {
	mediaFormat: 'PHOTO' | 'VIDEO';
	sourceUrl: string;
}

export interface ILocalPost {
	name?: string;
	languageCode?: string;
	summary?: string;
	eventTitle?: string;
	eventStartTime?: string; // ISO 8601 format
	eventEndTime?: string; // ISO 8601 format
	media?: IMediaItem[];
	callToAction?: ICallToAction;
	topicType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
}

export interface IReviewReply {
	comment: string;
}
