import { DateTime } from "../DateTime.node";

export interface IFormQuery {
		includeTodayCount?: boolean;
		pretty?: boolean;
}

export interface IWebhook {
		url: string;
		handshakeKey?: string;
		metadata?: boolean;
}

export interface IField {
		title: string;
		type: string;
		id: string;
		value: string | number | Date | DateTime | boolean | undefined;
}
