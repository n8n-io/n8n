export interface Team {
	id: string;
	displayName: string;
}

export interface Channel {
	id: string;
	displayName: string;
}

export interface Chat {
	id: string;
	displayName: string;
	url?: string;
}

export interface Subscription {
	notificationUrl: string;
	id: string;
	expirationDateTime: string;
}
