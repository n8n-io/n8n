export interface IFormQuery {
		includeTodayCount?: boolean;
		pretty?: boolean;
}

export interface IWebhook {
		url: string;
		handshakeKey?: string;
		metadata?: boolean;
}