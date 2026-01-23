import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'mailpit';
const SMTP_PORT = 1025;
const HTTP_PORT = 8025;

type MailpitAddress = {
	Address: string;
	Name?: string;
};

export type MailpitMessageSummary = {
	ID: string;
	MessageID: string;
	Read: boolean;
	From: MailpitAddress;
	To: MailpitAddress[];
	Cc: MailpitAddress[] | null;
	Bcc: MailpitAddress[] | null;
	ReplyTo: MailpitAddress[];
	Subject: string;
	Created: string;
	Username: string;
	Tags: string[];
	Size: number;
	Attachments: number;
	Snippet: string;
};

export type MailpitMessage = MailpitMessageSummary & {
	Text?: string;
	HTML?: string;
	Inline?: Array<{
		PartID: string;
		FileName: string;
		ContentType: string;
		ContentID: string;
		Size: number;
	}>;
	Attachments?: Array<{
		PartID: string;
		FileName: string;
		ContentType: string;
		ContentID: string;
		Size: number;
	}>;
};

export type MailpitQuery = {
	to?: string | RegExp;
	subject?: string | RegExp;
};

type MailpitListResponse = {
	total: number;
	unread: number;
	count: number;
	messages_count: number;
	messages_unread: number;
	start: number;
	tags: string[];
	messages: MailpitMessageSummary[];
};

export interface MailpitMeta {
	apiBaseUrl: string;
}

export type MailpitResult = ServiceResult<MailpitMeta>;

export const mailpit: Service<MailpitResult> = {
	description: 'Email testing server',

	async start(network: StartedNetwork, projectName: string): Promise<MailpitResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.mailpit)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(SMTP_PORT, HTTP_PORT)
				.withEnvironment({
					MP_UI_BIND_ADDR: `0.0.0.0:${HTTP_PORT}`,
					MP_SMTP_BIND_ADDR: `0.0.0.0:${SMTP_PORT}`,
				})
				.withWaitStrategy(
					Wait.forAll([
						Wait.forListeningPorts(),
						Wait.forHttp('/api/v1/info', HTTP_PORT).forStatusCode(200).withStartupTimeout(30000),
					]),
				)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			return {
				container,
				meta: {
					apiBaseUrl: `http://${container.getHost()}:${container.getMappedPort(HTTP_PORT)}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(): Record<string, string> {
		return {
			N8N_EMAIL_MODE: 'smtp',
			N8N_SMTP_HOST: HOSTNAME,
			N8N_SMTP_PORT: String(SMTP_PORT),
			N8N_SMTP_SSL: 'false',
			N8N_SMTP_SENDER: 'test@n8n.local',
		};
	},
};

export class MailpitHelper {
	private readonly apiBaseUrl: string;

	constructor(apiBaseUrl: string) {
		this.apiBaseUrl = apiBaseUrl;
	}

	async clear(): Promise<void> {
		const res = await fetch(`${this.apiBaseUrl}/api/v1/messages`, { method: 'DELETE' });
		if (!res.ok) {
			throw new Error(`Mailpit clear failed: ${res.status} ${res.statusText}`);
		}
	}

	async list(): Promise<MailpitMessageSummary[]> {
		const res = await fetch(`${this.apiBaseUrl}/api/v1/messages`);
		if (!res.ok) {
			throw new Error(`Mailpit list failed: ${res.status} ${res.statusText}`);
		}

		const data = (await res.json()) as MailpitListResponse;
		return data.messages || [];
	}

	async get(id: string): Promise<MailpitMessage> {
		const res = await fetch(`${this.apiBaseUrl}/api/v1/message/${id}`);
		if (!res.ok) {
			throw new Error(`Mailpit get failed: ${res.status} ${res.statusText}`);
		}

		return (await res.json()) as MailpitMessage;
	}

	async waitForMessage(
		query: MailpitQuery,
		options: { timeoutMs?: number; pollMs?: number } = {},
	): Promise<MailpitMessageSummary> {
		const { timeoutMs = 10000, pollMs = 200 } = options;
		const deadline = Date.now() + timeoutMs;

		const messageMatches = (message: MailpitMessageSummary): boolean => {
			if (query.to) {
				const hasMatchingRecipient = message.To.some((recipient) =>
					typeof query.to === 'string'
						? recipient.Address === query.to
						: query.to!.test(recipient.Address),
				);
				if (!hasMatchingRecipient) return false;
			}

			if (query.subject) {
				const subjectMatches =
					typeof query.subject === 'string'
						? message.Subject === query.subject
						: query.subject.test(message.Subject);
				if (!subjectMatches) return false;
			}

			return true;
		};

		while (Date.now() < deadline) {
			const messages = await this.list();
			const match = messages.find(messageMatches);

			if (match) {
				return match;
			}

			await new Promise((resolve) => setTimeout(resolve, pollMs));
		}

		const queryParts = [];
		if (query.to) queryParts.push(`to: ${query.to}`);
		if (query.subject) queryParts.push(`subject: ${query.subject}`);

		throw new Error(`Mail not received within ${timeoutMs}ms. Query: ${queryParts.join(', ')}`);
	}
}

export function createMailpitHelper(ctx: HelperContext): MailpitHelper {
	const result = ctx.serviceResults.mailpit as MailpitResult | undefined;
	if (!result) {
		throw new Error('Mailpit service not found in context');
	}
	return new MailpitHelper(result.meta.apiBaseUrl);
}

declare module './types' {
	interface ServiceHelpers {
		mailpit: MailpitHelper;
	}
}
