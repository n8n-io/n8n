export interface CallToAction {
	actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL' | 'NONE';
	url: string;
}

export interface MediaItem {
	mediaFormat: 'PHOTO' | 'VIDEO';
	sourceUrl: string;
}

export interface LocalPost {
	name?: string;
	languageCode?: string;
	summary?: string;
	eventTitle?: string;
	eventStartTime?: string; // ISO 8601 format
	eventEndTime?: string; // ISO 8601 format
	media?: MediaItem[];
	callToAction?: CallToAction;
	topicType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT';
}
