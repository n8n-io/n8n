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
	resource: string;
	resourceData: ResourceData;
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

// `error` is the original object (ensureError), so a NodeApiError keeps its hint copy.
export type SubscriptionFailure =
	| { step: 'delete'; id: string; error: Error }
	| { step: 'create'; resource: string; error: Error };
