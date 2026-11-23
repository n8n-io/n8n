import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import type { FormatCallback } from 'html-to-text';
import type { IWebhookFunctions, RequestPath } from 'n8n-workflow';
import { NodeApiError, requestPath } from 'n8n-workflow';

import type { WebhookNotification } from './types';
import { logTrigger, parseResourceIds } from './utils-trigger';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../transport';

export type MessageFilters = {
	mentionsMe: boolean;
	keyword: string;
	skipSystemMessages: boolean;
	skipBotMessages: boolean;
};

const isMessageEvent = (event: unknown) =>
	event === 'newChannelMessage' || event === 'newChatMessage';

const validId = (id: unknown): id is string => typeof id === 'string' && id.length > 0;

// Logged values come from the request, so they are capped.
const logId = (value: unknown) => (typeof value === 'string' ? value.slice(0, 64) : undefined);

const httpStatus = (error: unknown) =>
	error instanceof NodeApiError ? (error.httpCode ?? undefined) : undefined;

export const errorText = (error: unknown) => ensureError(error).message.slice(0, 200);

/**
 * Whether core marked the error as a revoked credential. It has no HTTP status. The mark is
 * read as plain data, also from the wrapped error, so it does not depend on `instanceof`.
 */
const isRevokedCredential = (error: NodeApiError) => {
	const inner: unknown = error.cause;
	const failure: unknown = error.failure ?? (isRecord(inner) ? inner.failure : undefined);
	return isRecord(failure) && failure.cause === 'credential-invalid';
};

/** The error that must fail the execution, or `undefined` when the read can be skipped. */
function deniedError(
	this: IWebhookFunctions,
	error: unknown,
	permission: string,
	what: string,
): NodeApiError | undefined {
	if (!(error instanceof NodeApiError)) return undefined;
	if (isRevokedCredential(error)) return error;
	const status = httpStatus(error);
	if (status !== '401' && status !== '403') return undefined;
	const message = `Microsoft Teams Trigger could not read ${what}`;
	const description = `Grant the ${permission} permission to the credential and try again.`;
	return new NodeApiError(
		this.getNode(),
		{ message, description },
		{ message, description, httpCode: status },
	);
}

/** The enabled filters, or `undefined` when no filter is on. */
export function getMessageFilters(this: IWebhookFunctions): MessageFilters | undefined {
	// Read the filters first: with no filter on, the node must not read other parameters.
	const raw: unknown = this.getNodeParameter('filters', {});
	const options = isRecord(raw) ? raw : {};
	const keyword = typeof options.keyword === 'string' ? options.keyword.trim() : '';
	const skipSystemMessages = options.skipSystemMessages === true;
	const skipBotMessages = options.skipBotMessages === true;
	if (options.mentionsMe !== true && keyword === '' && !skipSystemMessages && !skipBotMessages) {
		return undefined;
	}
	if (!isMessageEvent(this.getNodeParameter('event', ''))) return undefined;
	const filters: MessageFilters = {
		// Service Principal has no signed-in user.
		mentionsMe:
			options.mentionsMe === true && getTeamsCredentialType.call(this) !== SERVICE_PRINCIPAL_AUTH,
		keyword,
		skipSystemMessages,
		skipBotMessages,
	};
	return filters.mentionsMe || keyword !== '' || skipSystemMessages || skipBotMessages
		? filters
		: undefined;
}

/** The signed-in user id, or `undefined` when the answer has none. */
async function readUserId(this: IWebhookFunctions): Promise<string | undefined> {
	const answer: unknown = await microsoftApiRequest.call(
		this,
		'GET',
		requestPath`/v1.0/me`,
		{},
		{ $select: 'id' },
	);
	return isRecord(answer) && validId(answer.id) ? answer.id : undefined;
}

/** The Graph path of the notified message, or `undefined` when the resource names no message. */
export function getMessagePath(
	this: IWebhookFunctions,
	resource: unknown,
): { path: RequestPath; permission: string } | undefined {
	const { teamId, channelId, parentMessageId, messageId, chatId } = parseResourceIds(resource);
	if (!validId(messageId)) return undefined;
	try {
		if (validId(teamId) && validId(channelId)) {
			const channelMessages = ['/v1.0/teams/', { id: teamId }, '/channels/', { id: channelId }];
			return {
				path: buildTeamsPath.call(
					this,
					validId(parentMessageId)
						? [
								...channelMessages,
								'/messages/',
								{ id: parentMessageId },
								'/replies/',
								{ id: messageId },
							]
						: [...channelMessages, '/messages/', { id: messageId }],
				),
				permission: 'ChannelMessage.Read.All',
			};
		}
		if (validId(chatId)) {
			return {
				path: buildTeamsPath.call(this, [
					'/v1.0/chats/',
					{ id: chatId },
					'/messages/',
					{ id: messageId },
				]),
				permission: 'Chat.Read',
			};
		}
	} catch {
		// `buildTeamsPath` rejects an unsafe id. The caller warns and drops the item.
	}
	return undefined;
}

// Teams sends an emoji as `<emoji alt="😀">` with no text inside, so the keyword matches the alt text.
const emojiAlt: FormatCallback = (elem, _walk, builder) => {
	const alt: unknown = elem.attribs?.alt;
	if (typeof alt === 'string') builder.addInline(alt);
};

async function plainBody(body: unknown): Promise<string> {
	if (!isRecord(body) || typeof body.content !== 'string') return '';
	if (body.contentType !== 'html') return body.content;
	// Lazy: only the keyword filter on an HTML body needs it.
	const { convert } = await import('html-to-text');
	return convert(body.content, {
		wordwrap: false,
		formatters: { emojiAlt },
		selectors: [
			{ selector: 'a', options: { ignoreHref: true } },
			{ selector: 'img', format: 'skip' },
			{ selector: 'emoji', format: 'emojiAlt' },
			{ selector: 'customemoji', format: 'emojiAlt' },
		],
	});
}

// Teams puts `&nbsp;` after a mention, so every run of whitespace counts as one space.
const normalize = (text: string) => text.replace(/\s+/g, ' ').toLowerCase();

/** Whether a Graph chatMessage passes every enabled filter. */
export async function messagePassesFilters(
	message: unknown,
	filters: MessageFilters,
	userId: string | undefined,
): Promise<boolean> {
	if (!isRecord(message)) return false;
	if (filters.skipSystemMessages && message.messageType !== 'message') return false;
	if (
		filters.skipBotMessages &&
		isRecord(message.from) &&
		message.from.application !== null &&
		message.from.application !== undefined
	) {
		return false;
	}
	if (filters.mentionsMe) {
		if (!validId(userId)) return false;
		const mentions = Array.isArray(message.mentions) ? message.mentions : [];
		const mentioned = mentions.some(
			(mention) =>
				isRecord(mention) &&
				isRecord(mention.mentioned) &&
				isRecord(mention.mentioned.user) &&
				mention.mentioned.user.id === userId,
		);
		if (!mentioned) return false;
	}
	if (filters.keyword !== '') {
		const keyword = normalize(filters.keyword);
		// Each text is checked alone, so a keyword never matches across subject and body.
		const texts = [
			await plainBody(message.body),
			typeof message.subject === 'string' ? message.subject : '',
		];
		if (!texts.some((text) => normalize(text).includes(keyword))) return false;
	}
	return true;
}

/**
 * Reads each notified message and keeps the notifications that pass the filters. A denied read
 * (401, 403 or a revoked credential) is returned as `denied` (the first one), so the caller
 * decides whether to throw.
 */
export async function filterChangeNotifications(
	this: IWebhookFunctions,
	notifications: WebhookNotification[],
	filters: MessageFilters,
): Promise<{ passed: WebhookNotification[]; denied?: NodeApiError }> {
	let userId: string | undefined;
	if (filters.mentionsMe) {
		// Read for each batch, not stored: a reconnected credential can belong to another user.
		let failure: Record<string, unknown> = {};
		try {
			userId = await readUserId.call(this);
		} catch (error) {
			const denied = deniedError.call(this, error, 'User.Read', 'the signed-in user');
			if (denied) return { passed: [], denied };
			failure = { status: httpStatus(error), error: errorText(error) };
		}
		if (userId === undefined) {
			logTrigger.call(
				this,
				'warn',
				'could not read the signed-in user, Mentions Me notifications skipped',
				failure,
			);
			return { passed: [] };
		}
	}

	const passed: WebhookNotification[] = [];
	let denied: NodeApiError | undefined;
	// Graph already has its 202, so a skipped notification is final.
	// ponytail: no batch cap. The reads run one at a time, so a large batch under throttling holds
	// this request open for its whole length. Add a cap or a queue for each channel if long webhook
	// requests show up.
	for (const notification of notifications) {
		const fields = {
			subscriptionId: logId(notification.subscriptionId),
			messageId: logId(notification.resourceData?.id),
		};
		const target = getMessagePath.call(this, notification.resource);
		if (!target) {
			const { resource } = notification;
			logTrigger.call(this, 'warn', 'notification without a message path skipped', {
				...fields,
				resource:
					typeof resource === 'string' ? JSON.stringify(resource.slice(0, 120)) : typeof resource,
			});
			continue;
		}
		try {
			const message: unknown = await microsoftApiRequest.call(this, 'GET', target.path);
			if (await messagePassesFilters(message, filters, userId)) passed.push(notification);
		} catch (error) {
			const status = httpStatus(error);
			const deniedRead = deniedError.call(this, error, target.permission, 'the message');
			if (deniedRead) {
				denied ??= deniedRead;
				// Every later read fails the same way and starts its own token refresh.
				if (isRevokedCredential(deniedRead)) break;
			} else if (status === '404') {
				logTrigger.call(this, 'debug', 'message gone, notification skipped', fields);
			} else {
				logTrigger.call(this, 'warn', 'failed to read message, notification skipped', {
					...fields,
					status,
					error: errorText(error),
				});
			}
		}
	}
	return { passed, denied };
}
