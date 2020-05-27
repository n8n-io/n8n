export interface IFormQuery {
		includeTodayCount?: boolean;
}

export interface IWebhook {
		url: string;
		handshakeKey?: string;
		metadata?: boolean;
}

export interface IField {
		Title: string;
		Instructions: string;
		IsRequired: number;
		ClassNames: string;
		DefaultVal: string;
		Page: number;
		Type: string;
		ID: string;
}