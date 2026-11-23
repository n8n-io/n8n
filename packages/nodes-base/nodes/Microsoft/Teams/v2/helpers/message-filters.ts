import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import type { IHookFunctions, IWebhookFunctions, RequestPath } from 'n8n-workflow';
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

/** The enabled filters, or `undefined` when no filter is on. */
export function getMessageFilters(this: IWebhookFunctions): MessageFilters | undefined {
	if (!isMessageEvent(this.getNodeParameter('event', ''))) return undefined;
	const raw: unknown = this.getNodeParameter('filters', {});
	const options = isRecord(raw) ? raw : {};
	const filters: MessageFilters = {
		// Service Principal has no signed-in user.
		mentionsMe:
			options.mentionsMe === true && getTeamsCredentialType.call(this) !== SERVICE_PRINCIPAL_AUTH,
		keyword: typeof options.keyword === 'string' ? options.keyword.trim() : '',
		skipSystemMessages: options.skipSystemMessages === true,
		skipBotMessages: options.skipBotMessages === true,
	};
	return filters.mentionsMe ||
		filters.keyword !== '' ||
		filters.skipSystemMessages ||
		filters.skipBotMessages
		? filters
		: undefined;
}

/** The signed-in user id, or `undefined` when the answer has none. */
async function readUserId(this: IHookFunctions | IWebhookFunctions): Promise<string | undefined> {
	const answer: unknown = await microsoftApiRequest.call(
		this,
		'GET',
		requestPath`/v1.0/me`,
		{},
		{ $select: 'id' },
	);
	return isRecord(answer) && validId(answer.id) ? answer.id : undefined;
}

/**
 * Stores the signed-in user id for Mentions Me at activation. Never throws: `webhook()` reads
 * `/me` itself when no id is stored.
 */
export async function storeMentionUserId(this: IHookFunctions): Promise<void> {
	const webhookData = this.getWorkflowStaticData('node');
	let id: string | undefined;
	let failure: Record<string, unknown> = {};
	try {
		// Read only this option: an unresolvable expression in another filter must not fail the activation.
		const wanted =
			isMessageEvent(this.getNodeParameter('event', '')) &&
			getTeamsCredentialType.call(this) !== SERVICE_PRINCIPAL_AUTH &&
			this.getNodeParameter('filters.mentionsMe', false) === true;
		if (!wanted) {
			if ('mentionUserId' in webhookData) delete webhookData.mentionUserId;
			return;
		}
		id = await readUserId.call(this);
	} catch (error) {
		failure = { status: httpStatus(error), error: errorText(error) };
	}
	if (id === undefined) {
		logTrigger.call(
			this,
			'warn',
			'could not read the signed-in user; Mentions Me needs the User.Read permission',
			failure,
		);
		// A stale id can belong to another user.
		if ('mentionUserId' in webhookData) delete webhookData.mentionUserId;
		return;
	}
	// Each static-data write is a database save.
	if (webhookData.mentionUserId !== id) webhookData.mentionUserId = id;
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

async function plainBody(body: unknown): Promise<string> {
	if (!isRecord(body) || typeof body.content !== 'string') return '';
	if (body.contentType !== 'html') return body.content;
	// Lazy: only the keyword filter on an HTML body needs it.
	const { convert } = await import('html-to-text');
	return convert(body.content, {
		wordwrap: false,
		selectors: [
			{ selector: 'a', options: { ignoreHref: true } },
			{ selector: 'img', format: 'skip' },
		],
	});
}

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
		const keyword = filters.keyword.toLowerCase();
		// Each text is checked alone, so a keyword never matches across subject and body.
		const texts = [
			await plainBody(message.body),
			typeof message.subject === 'string' ? message.subject : '',
		];
		if (!texts.some((text) => text.toLowerCase().includes(keyword))) return false;
	}
	return true;
}

/**
 * Reads each notified message and keeps the notifications that pass the filters. A 401 or 403
 * is returned as `denied` (the first one), so the caller decides whether to throw.
 */
export async function filterChangeNotifications(
	this: IWebhookFunctions,
	notifications: WebhookNotification[],
	filters: MessageFilters,
): Promise<{ passed: WebhookNotification[]; denied?: NodeApiError }> {
	let userId: string | undefined;
	if (filters.mentionsMe) {
		const stored = this.getWorkflowStaticData('node').mentionUserId;
		if (validId(stored)) {
			userId = stored;
		} else {
			// No static-data write here: a write in `webhook()` can be lost.
			let failure: Record<string, unknown> = {};
			try {
				userId = await readUserId.call(this);
			} catch (error) {
				failure = { status: httpStatus(error), error: errorText(error) };
			}
			if (userId === undefined) {
				logTrigger.call(
					this,
					'warn',
					'could not read the signed-in user, Mentions Me notifications skipped; grant User.Read',
					failure,
				);
				return { passed: [] };
			}
		}
	}

	const passed: WebhookNotification[] = [];
	let denied: NodeApiError | undefined;
	// Graph already has its 202, so a skipped notification is final.
	// ponytail: no batch cap. GETs run one after another for each request, not for each channel, so a
	// large batch under throttling holds this handler for its whole length. Add a cap (or a per-channel
	// queue) if long-running webhook requests show up.
	for (const notification of notifications) {
		const fields = {
			subscriptionId: logId(notification.subscriptionId),
			messageId: logId(notification.resourceData?.id),
		};
		const target = getMessagePath.call(this, notification.resource);
		if (!target) {
			logTrigger.call(this, 'warn', 'notification without a message path skipped', {
				...fields,
				resource: JSON.stringify(String(notification.resource).slice(0, 120)),
			});
			continue;
		}
		try {
			const message: unknown = await microsoftApiRequest.call(this, 'GET', target.path);
			if (await messagePassesFilters(message, filters, userId)) passed.push(notification);
		} catch (error) {
			const status = httpStatus(error);
			if (status === '404') {
				logTrigger.call(this, 'debug', 'message gone, notification skipped', fields);
			} else if (status === '401' || status === '403') {
				if (!denied) {
					const message = 'Microsoft Teams Trigger could not read the message';
					const description = `Grant the ${target.permission} permission to the credential and try again.`;
					denied = new NodeApiError(
						this.getNode(),
						{ message, description },
						{ message, description, httpCode: status },
					);
				}
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
