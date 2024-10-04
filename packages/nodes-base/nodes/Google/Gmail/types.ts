export type Message = {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	historyId: string;
	internalDate: string;
	sizeEstimate: number;
	raw: string;
	payload: MessagePart;
};

export type ListMessage = Pick<Message, 'id' | 'threadId'>;

export type MessageListResponse = {
	messages: ListMessage[];
	nextPageToken?: string;
	resultSizeEstimate: number;
};

type GmailHeader = {
	name: string;
	value: string;
};

type MessagePart = {
	partId: string;
	mimeType: string;
	filename: string;
	headers: GmailHeader[];
	body: MessagePartBody;
	parts: MessagePart[];
};

type MessagePartBody = {
	attachmentId: string;
	size: number;
	data: string;
};
