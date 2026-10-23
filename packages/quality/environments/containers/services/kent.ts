/**
 * Kent - Sentry's mock server for testing SDK integrations
 * @see https://github.com/getsentry/kent
 */
import { resolve } from 'node:path';
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import type { HelperContext, Service, ServiceResult, ServiceMeta } from './types';

const HOSTNAME = 'kent';
const PORT = 8000;
const DOCKERFILE_PATH = resolve(__dirname, '../dockerfiles/kent');

export interface KentMeta extends ServiceMeta {
	host: string;
	port: number;
	apiUrl: string;
	sentryDsn: string;
	frontendDsn: string;
}

export type KentResult = ServiceResult<KentMeta>;

export const kent: Service<KentResult> = {
	description: 'Sentry mock server for testing',

	async start(network: StartedNetwork, projectName: string): Promise<KentResult> {
		const container = await GenericContainer.fromDockerfile(DOCKERFILE_PATH)
			.build('n8n-kent:local', { deleteOnExit: false })
			.then(
				async (image) =>
					await image
						.withNetwork(network)
						.withNetworkAliases(HOSTNAME)
						.withExposedPorts(PORT)
						.withWaitStrategy(Wait.forListeningPorts())
						.withLabels({
							'com.docker.compose.project': projectName,
							'com.docker.compose.service': HOSTNAME,
						})
						.withName(`${projectName}-${HOSTNAME}`)
						.withReuse()
						.start(),
			);

		const mappedPort = container.getMappedPort(PORT);
		const host = container.getHost();

		return {
			container,
			meta: {
				host: HOSTNAME,
				port: PORT,
				apiUrl: `http://${host}:${mappedPort}`,
				sentryDsn: `http://testkey@${HOSTNAME}:${PORT}/1`,
				frontendDsn: `http://testkey@${host}:${mappedPort}/1`,
			},
		};
	},

	env(result: KentResult): Record<string, string> {
		return {
			N8N_SENTRY_DSN: result.meta.sentryDsn,
			N8N_FRONTEND_SENTRY_DSN: result.meta.frontendDsn,
			N8N_SENTRY_TRACES_SAMPLE_RATE: '1.0',
			ENVIRONMENT: 'test',
			DEPLOYMENT_NAME: 'e2e-test-deployment',
		};
	},
};

// ==================== Types ====================

export type EventSource = 'backend' | 'frontend' | 'task_runner' | 'unknown';
export type EventType = 'error' | 'transaction' | 'session' | 'unknown';

export interface KentEventFilter {
	source?: EventSource;
	type?: EventType;
	messageContains?: string;
}

export interface KentEvent {
	event_id: string;
	project_id: number;
	payload: {
		body: {
			sdk?: { name: string; version: string };
			platform?: string;
			type?: string;
			transaction?: string;
			tags?: Record<string, string>;
			user?: { id?: string; email?: string; username?: string; ip_address?: string };
			exception?: { values: Array<{ type: string; value: string }> };
			spans?: unknown[];
			[key: string]: unknown;
		};
	};
}

// ==================== Helper ====================

export class KentHelper {
	constructor(private readonly apiUrl: string) {}

	async clear(): Promise<void> {
		const res = await fetch(`${this.apiUrl}/api/flush/`, { method: 'POST' });
		if (!res.ok) throw new Error(`Kent API error: ${res.status}`);
	}

	async getEvents(filter?: KentEventFilter): Promise<KentEvent[]> {
		const res = await fetch(`${this.apiUrl}/api/eventlist/`);
		if (!res.ok) throw new Error(`Kent API error: ${res.status}`);
		const { events } = (await res.json()) as { events: Array<{ event_id: string }> };
		const allEvents = await Promise.all(events.map(async (e) => await this.getEvent(e.event_id)));

		if (!filter) return allEvents;

		return allEvents.filter((event) => {
			if (filter.source && this.getSource(event) !== filter.source) return false;
			if (filter.type && this.getType(event) !== filter.type) return false;
			if (filter.messageContains && !this.getErrorMessage(event).includes(filter.messageContains))
				return false;
			return true;
		});
	}

	getSource(event: KentEvent): EventSource {
		const sdk = event.payload.body.sdk?.name ?? '';
		if (sdk.includes('vue') || sdk.includes('browser')) return 'frontend';
		if (sdk === 'sentry.javascript.node' || event.payload.body.platform === 'node') {
			return event.payload.body.tags?.server_type === 'task_runner' ? 'task_runner' : 'backend';
		}
		if ('sid' in event.payload.body) return 'frontend';
		return 'unknown';
	}

	getType(event: KentEvent): EventType {
		const body = event.payload.body;
		if ('sid' in body) return 'session';
		if (body.exception) return 'error';
		if (body.type === 'transaction' || Array.isArray(body.spans)) return 'transaction';
		return 'unknown';
	}

	getErrorMessage(event: KentEvent): string {
		return event.payload.body.exception?.values?.[0]?.value ?? '';
	}

	getTags(event: KentEvent): Record<string, string> | undefined {
		return event.payload.body.tags;
	}

	getUser(event: KentEvent): KentEvent['payload']['body']['user'] {
		return event.payload.body.user;
	}

	private async getEvent(eventId: string): Promise<KentEvent> {
		const res = await fetch(`${this.apiUrl}/api/event/${eventId}`);
		if (!res.ok) throw new Error(`Kent API error: ${res.status}`);
		return (await res.json()) as KentEvent;
	}
}

export function createKentHelper(ctx: HelperContext): KentHelper {
	const result = ctx.serviceResults.kent as KentResult | undefined;
	if (!result) throw new Error('Kent service not found. Add "kent" to your services array.');
	return new KentHelper(result.meta.apiUrl);
}

declare module './types' {
	interface ServiceHelpers {
		kent: KentHelper;
	}
}
