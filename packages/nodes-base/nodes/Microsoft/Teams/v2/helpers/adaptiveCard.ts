import { randomUUID } from 'node:crypto';

import { isRecord } from '@n8n/utils/is-record';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type ChatMessageBody = {
	body: {
		contentType: 'html';
		content: string;
	};
	attachments: Array<{
		id: string;
		contentType: 'application/vnd.microsoft.card.adaptive';
		contentUrl: null;
		content: string;
	}>;
};

const MAX_ENVELOPE_BYTES = 102400;

const UNSUPPORTED_ACTIONS = new Set(['Action.Submit', 'Action.ShowCard', 'Action.Execute']);

/**
 * Graph messages can run only `Action.OpenUrl`. Other interactive actions need a bot, so a card
 * that carries one either fails or renders a button that does nothing. Walk `actions` arrays only,
 * so a payload in an action's `data` is not mistaken for an action.
 */
function findUnsupportedAction(value: unknown): string | undefined {
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findUnsupportedAction(item);
			if (found !== undefined) return found;
		}
		return undefined;
	}

	if (!isRecord(value)) return undefined;

	if (Array.isArray(value.actions)) {
		for (const action of value.actions) {
			if (
				isRecord(action) &&
				typeof action.type === 'string' &&
				UNSUPPORTED_ACTIONS.has(action.type)
			) {
				return action.type;
			}
		}
	}

	for (const [key, child] of Object.entries(value)) {
		if (key === 'data') continue;
		const found = findUnsupportedAction(child);
		if (found !== undefined) return found;
	}

	return undefined;
}

/**
 * Builds the Graph message envelope for an Adaptive Card. The card may arrive as an object or
 * as a JSON string. The card must be an object with `type: "AdaptiveCard"`, it must not carry an
 * interactive action that needs a bot, and the serialized envelope must stay within Microsoft's
 * 100 KB limit.
 */
export function buildAdaptiveCardMessage(
	this: IExecuteFunctions,
	cardInput: unknown,
	itemIndex: number,
): ChatMessageBody {
	let parsed: unknown = cardInput;

	if (typeof cardInput === 'string') {
		try {
			parsed = JSON.parse(cardInput);
		} catch {
			throw new NodeOperationError(this.getNode(), 'The adaptive card must be valid JSON', {
				itemIndex,
			});
		}
	}

	if (!isRecord(parsed)) {
		throw new NodeOperationError(this.getNode(), 'The adaptive card must be a JSON object', {
			itemIndex,
		});
	}

	if (parsed.type !== 'AdaptiveCard') {
		throw new NodeOperationError(
			this.getNode(),
			'The adaptive card must have type "AdaptiveCard"',
			{
				itemIndex,
			},
		);
	}

	const unsupportedAction = findUnsupportedAction(parsed);
	if (unsupportedAction !== undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`The adaptive card contains an unsupported action: ${unsupportedAction}`,
			{
				itemIndex,
				description:
					'Microsoft Graph messages support only Action.OpenUrl. Use a bot to handle Action.Submit, Action.ShowCard or Action.Execute.',
			},
		);
	}

	const id = randomUUID();
	const envelope: ChatMessageBody = {
		body: {
			contentType: 'html',
			content: `<attachment id="${id}"></attachment>`,
		},
		attachments: [
			{
				id,
				contentType: 'application/vnd.microsoft.card.adaptive',
				contentUrl: null,
				content: JSON.stringify(parsed),
			},
		],
	};

	if (Buffer.byteLength(JSON.stringify(envelope), 'utf8') > MAX_ENVELOPE_BYTES) {
		throw new NodeOperationError(
			this.getNode(),
			'The adaptive card is larger than the 100 KB limit',
			{ itemIndex },
		);
	}

	return envelope;
}
