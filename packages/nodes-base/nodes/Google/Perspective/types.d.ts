export type CommentAnalyzeBody = {
	comment: Comment;
	requestedAttributes: RequestedAttributes;
	languages?: Language;
};

export type Language = 'de' | 'en' | 'fr';

export type Comment = {
	text?: string;
	type?: string;
};

export type RequestedAttributes = {
	[key: string]: {
		scoreType?: string;
		scoreThreshold?: {
			value: number
		};
	};
};

export type AttributesValuesUi = {
	attributeName: string;
	scoreThreshold: number;
};
