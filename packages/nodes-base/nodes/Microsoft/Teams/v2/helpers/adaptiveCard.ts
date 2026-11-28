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

/**
 * Builds the Graph message envelope for an Adaptive Card. The card may arrive as an object or
 * as a JSON string. The card must be an object with `type: "AdaptiveCard"`, and the serialized
 * envelope must stay within Microsoft's 100 KB limit.
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
