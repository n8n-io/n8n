export interface TeamResponse {
	id: string;
	displayName: string;
}

export interface ChannelResponse {
	id: string;
	displayName: string;
}

export interface WebhookNotification {
	subscriptionId: string;
	changeType?: string;
	// Wire data that nothing checks. `parseResourceIds` takes `unknown` for this reason.
	resource: string;
	resourceData?: ResourceData;
	tenantId: string;
	subscriptionExpirationDateTime: string;
	clientState?: string;
}

export interface ResourceData {
	id: string;
	[key: string]: unknown;
}

export interface LifecycleNotification {
	// Graph sends a string; the handler checks the value before it uses it.
	subscriptionId: unknown;
	subscriptionExpirationDateTime?: string;
	tenantId?: string;
	clientState?: string;
	lifecycleEvent: string;
}

export interface SubscriptionResponse {
	id: string;
	expirationDateTime: string;
	notificationUrl: string;
	resource: string;
}
