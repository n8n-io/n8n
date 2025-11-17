export type Message = {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	historyId: string;
	date?: string;
	headers?: Record<string, string>;
	internalDate?: string;
	sizeEstimate: number;
	raw: string;
	payload: MessagePart;
};

export type ListMessage = Pick<Message, 'id' | 'threadId'>;

export type MessageListResponse = {
	messages?: ListMessage[];
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

export type Label = {
	id: string;
	name: string;
	messageListVisibility?: 'hide';
	labelListVisibility?: 'labelHide';
	type?: 'system';
};

export type GmailWorkflowStaticData = {
	lastTimeChecked?: number;
	possibleDuplicates?: string[];
};
export type GmailWorkflowStaticDataDictionary = Record<string, GmailWorkflowStaticData>;

export type GmailTriggerOptions = Partial<{
	dataPropertyAttachmentsPrefixName: string;
	downloadAttachments: boolean;
}>;

export type GmailTriggerFilters = Partial<{
	sender: string;
	q: string;
	includeSpamTrash: boolean;
	includeDrafts: boolean;
	readStatus: 'read' | 'unread' | 'both';
	labelIds: string[];
	receivedAfter: number;
}>;

export type GmailMessage = {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	historyId: string;
	internalDate?: string;
	headers?: Record<string, string>;
	sizeEstimate: number;
	raw: string;
	payload: MessagePart;
};

export type GmailMessageMetadata = Pick<GmailMessage, 'id' | 'threadId' | 'labelIds' | 'payload'>;

export type GmailUserProfile = {
	emailAddress: string;
	messagesTotal: number;
	threadsTotal: number;
	historyId: string;
};
