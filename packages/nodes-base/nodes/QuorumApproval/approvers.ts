import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const CHANNELS = ['slack', 'email', 'telegram'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_NAMES: Record<Channel, string> = {
	slack: 'Slack',
	email: 'Email',
	telegram: 'Telegram',
};

export type ApprovalsRequired = 'any' | 'majority' | 'all' | 'custom';

/** One entry of the approver list, as the node reads it before it sends anything. */
export interface Approver {
	/** What the result of the ballot shows for this approver. */
	name: string;
	channel: Channel;
	/** Slack user or channel ID, email address, or Telegram chat ID. */
	recipient: string;
	messageOverride?: string;
}

const isChannel = (value: unknown): value is Channel =>
	typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** The value of a resource locator, or of a plain string parameter. */
function locatorValue(value: unknown): string {
	if (typeof value === 'object' && value !== null && 'value' in value) {
		return asString(value.value);
	}
	return asString(value);
}

function recipientOf(entry: IDataObject, channel: Channel): string {
	if (channel === 'email') return asString(entry.email);
	if (channel === 'telegram') return asString(entry.chatId);
	return entry.slackTarget === 'channel'
		? locatorValue(entry.slackChannel)
		: locatorValue(entry.slackUser);
}

/** Reads the approver list and checks that each entry can be sent to. */
export function parseApprovers(node: INode, entries: unknown, channels: Channel[]): Approver[] {
	if (!Array.isArray(entries) || entries.length === 0) {
		throw new NodeOperationError(node, 'Add at least one approver');
	}

	return entries.map((entry: IDataObject, index) => {
		const channel = entry.channel;
		const position = `Approver ${index + 1}`;
		if (!isChannel(channel)) {
			throw new NodeOperationError(node, `${position} has no channel`);
		}

		const recipient = recipientOf(entry, channel);
		const label = asString(entry.label);
		const name = label || `${CHANNEL_NAMES[channel]} · ${recipient}`;
		if (!channels.includes(channel)) {
			throw new NodeOperationError(
				node,
				`'${label || position}' uses ${CHANNEL_NAMES[channel]}, which is not in Channels`,
				{
					description: `Add ${CHANNEL_NAMES[channel]} to Channels, or change the approver's channel.`,
				},
			);
		}
		if (!recipient) {
			throw new NodeOperationError(node, `'${label || position}' has no recipient`);
		}

		const messageOverride = asString(entry.messageOverride);
		return { name, channel, recipient, ...(messageOverride ? { messageOverride } : {}) };
	});
}

/** How many approvals approve the request. */
export function resolveRequired(
	node: INode,
	preset: ApprovalsRequired,
	custom: number,
	approvers: number,
): number {
	const required =
		preset === 'any'
			? 1
			: preset === 'all'
				? approvers
				: preset === 'majority'
					? Math.floor(approvers / 2) + 1
					: custom;

	if (!Number.isInteger(required) || required < 1 || required > approvers) {
		throw new NodeOperationError(
			node,
			`Approvals required must be between 1 and ${approvers}, the number of approvers`,
		);
	}
	return required;
}
