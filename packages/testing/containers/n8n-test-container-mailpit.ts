import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from './n8n-test-container-utils';
import { TEST_CONTAINER_IMAGES } from './test-containers';

type MailpitAddress = {
	Address: string;
	Name?: string;
};

// Message summary as returned in list responses
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

// Full message as returned by GET /api/v1/message/{id}
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

export type MailpitListResponse = {
	total: number;
	unread: number;
	count: number; // Deprecated but kept for backwards compatibility
	messages_count: number;
	messages_unread: number;
	start: number;
	tags: string[];
	messages: MailpitMessageSummary[];
};

export function getMailpitEnvironment(
	hostname = 'mailpit',
	smtpPort = 1025,
): Record<string, string> {
	return {
		N8N_EMAIL_MODE: 'smtp',
		N8N_SMTP_HOST: hostname,
		N8N_SMTP_PORT: String(smtpPort),
		N8N_SMTP_SSL: 'false',
		N8N_SMTP_SENDER: 'test@n8n.local',
	};
}

export async function setupMailpit({
	projectName,
	network,
	hostname = 'mailpit',
	smtpPort = 1025,
	httpPort = 8025,
}: {
	projectName: string;
	network: StartedNetwork;
	hostname?: string;
	smtpPort?: number;
	httpPort?: number;
}): Promise<StartedTestContainer> {
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		return await new GenericContainer(TEST_CONTAINER_IMAGES.mailpit)
			.withNetwork(network)
			.withNetworkAliases(hostname)
			.withExposedPorts(smtpPort, httpPort)
			.withEnvironment({
				MP_UI_BIND_ADDR: `0.0.0.0:${httpPort}`,
				MP_SMTP_BIND_ADDR: `0.0.0.0:${smtpPort}`,
			})
			.withWaitStrategy(
				Wait.forAll([
					Wait.forListeningPorts(),
					Wait.forHttp('/api/v1/info', httpPort).forStatusCode(200).withStartupTimeout(30000),
				]),
			)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': 'mailpit',
			})
			.withName(`${projectName}-mailpit`)
			.withReuse()
			.withLogConsumer(consumer)
			.start();
	} catch (error) {
		return throwWithLogs(error);
	}
}

export function getMailpitApiBaseUrl(container: StartedTestContainer): string {
	return `http://${container.getHost()}:${container.getMappedPort(8025)}`;
}

export async function mailpitClear(apiBaseUrl: string): Promise<void> {
	const res = await fetch(`${apiBaseUrl}/api/v1/messages`, { method: 'DELETE' });
	if (!res.ok) {
		throw new Error(`Mailpit clear failed: ${res.status} ${res.statusText}`);
	}
}

export async function mailpitList(apiBaseUrl: string): Promise<MailpitMessageSummary[]> {
	const res = await fetch(`${apiBaseUrl}/api/v1/messages`);
	if (!res.ok) {
		throw new Error(`Mailpit list failed: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as MailpitListResponse;
	return data.messages || [];
}

export async function mailpitGet(apiBaseUrl: string, id: string): Promise<MailpitMessage> {
	const res = await fetch(`${apiBaseUrl}/api/v1/message/${id}`);
	if (!res.ok) {
		throw new Error(`Mailpit get failed: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as MailpitMessage;
	return data;
}

export async function mailpitWaitForMessage(
	apiBaseUrl: string,
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
		const messages = await mailpitList(apiBaseUrl);
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
