import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Validates and processes Jira webhook events to ensure correct filtering
 * and prevent duplicate executions
 */

export interface JiraWebhookPayload {
	webhookEvent?: string;
	issue_event_type_name?: string;
	timestamp?: number;
	issue?: {
		id?: string;
		key?: string;
		fields?: {
			project?: {
				key?: string;
				id?: string;
			};
		};
	};
	[key: string]: unknown;
}

export interface ValidationResult {
	isValid: boolean;
	reason?: string;
}

/**
 * Validates that the incoming webhook event matches the configured event types
 */
export function validateEventType(
	payload: JiraWebhookPayload,
	configuredEvents: string[],
): ValidationResult {
	const webhookEvent = payload.webhookEvent;
	const issueEventType = payload.issue_event_type_name;

	if (!webhookEvent) {
		return {
			isValid: false,
			reason: 'Missing webhookEvent field in payload',
		};
	}

	// Check if the webhook event matches any configured event
	const eventMatches = configuredEvents.some((configuredEvent) => {
		// Handle wildcard
		if (configuredEvent === '*') {
			return true;
		}

		// Direct match
		if (webhookEvent === configuredEvent) {
			return true;
		}

		// For issue events, also check issue_event_type_name
		// Some Jira versions use different field names
		if (issueEventType && configuredEvent.includes(issueEventType)) {
			return true;
		}

		return false;
	});

	if (!eventMatches) {
		return {
			isValid: false,
			reason: `Event type '${webhookEvent}' does not match configured events: ${configuredEvents.join(', ')}`,
		};
	}

	return { isValid: true };
}

/**
 * Extracts project information from the webhook payload
 */
export function extractProjectInfo(payload: JiraWebhookPayload): {
	projectKey?: string;
	projectId?: string;
} {
	const projectKey = payload.issue?.fields?.project?.key;
	const projectId = payload.issue?.fields?.project?.id;

	return { projectKey, projectId };
}

/**
 * Generates a unique identifier for a webhook event to prevent duplicate processing
 * Uses a combination of webhook event type, issue ID, and timestamp
 */
export function generateEventId(payload: JiraWebhookPayload): string {
	const webhookEvent = payload.webhookEvent || 'unknown';
	const issueId = payload.issue?.id || payload.issue?.key || 'no-issue';
	const timestamp = payload.timestamp || Date.now();

	return `${webhookEvent}:${issueId}:${timestamp}`;
}

/**
 * Validates the complete webhook payload structure
 */
export function validateWebhookPayload(payload: unknown): payload is JiraWebhookPayload {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const data = payload as IDataObject;

	// Must have webhookEvent field
	if (!data.webhookEvent || typeof data.webhookEvent !== 'string') {
		return false;
	}

	return true;
}

/**
 * Checks if an event has already been processed based on a simple time-based deduplication
 * This prevents the same event from being processed multiple times within a short window
 */
export class EventDeduplicator {
	private processedEvents: Map<string, number> = new Map();
	private readonly cleanupInterval: NodeJS.Timeout;
	private readonly eventTTL: number;

	constructor(eventTTLMs: number = 60000) {
		// Default 60 seconds
		this.eventTTL = eventTTLMs;

		// Clean up old events every 30 seconds
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 30000);
	}

	/**
	 * Check if an event has been processed recently
	 */
	isDuplicate(eventId: string): boolean {
		const lastProcessed = this.processedEvents.get(eventId);
		if (!lastProcessed) {
			return false;
		}

		const now = Date.now();
		const age = now - lastProcessed;

		// If the event was processed within the TTL window, it's a duplicate
		return age < this.eventTTL;
	}

	/**
	 * Mark an event as processed
	 */
	markProcessed(eventId: string): void {
		this.processedEvents.set(eventId, Date.now());
	}

	/**
	 * Remove old events from the cache
	 */
	private cleanup(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [eventId, timestamp] of this.processedEvents.entries()) {
			if (now - timestamp > this.eventTTL) {
				keysToDelete.push(eventId);
			}
		}

		for (const key of keysToDelete) {
			this.processedEvents.delete(key);
		}
	}

	/**
	 * Clear all processed events (useful for testing)
	 */
	clear(): void {
		this.processedEvents.clear();
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		clearInterval(this.cleanupInterval);
		this.processedEvents.clear();
	}
}

// Global deduplicator instance shared across all Jira Trigger nodes
let globalDeduplicator: EventDeduplicator | null = null;

export function getGlobalDeduplicator(): EventDeduplicator {
	if (!globalDeduplicator) {
		globalDeduplicator = new EventDeduplicator();
	}
	return globalDeduplicator;
}

/**
 * Reset the global deduplicator (useful for testing)
 */
export function resetGlobalDeduplicator(): void {
	if (globalDeduplicator) {
		globalDeduplicator.destroy();
		globalDeduplicator = null;
	}
}
