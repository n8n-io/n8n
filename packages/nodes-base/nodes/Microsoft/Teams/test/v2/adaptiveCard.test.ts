import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { buildAdaptiveCardMessage } from '../../v2/helpers/adaptiveCard';

const CARD = {
	type: 'AdaptiveCard',
	version: '1.4',
	body: [{ type: 'TextBlock', text: 'Hello from a card' }],
};

describe('Test MicrosoftTeamsV2, buildAdaptiveCardMessage', () => {
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		ctx = mock<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
	});

	it('builds the envelope from an object card', () => {
		const envelope = buildAdaptiveCardMessage.call(ctx, CARD, 0);

		expect(envelope.body.contentType).toBe('html');
		const match = /^<attachment id="([0-9a-f-]{36})"><\/attachment>$/.exec(envelope.body.content);
		expect(match).not.toBeNull();

		expect(envelope.attachments).toHaveLength(1);
		expect(envelope.attachments[0].id).toBe(match?.[1]);
		expect(envelope.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
		expect(envelope.attachments[0].contentUrl).toBeNull();
		expect(JSON.parse(envelope.attachments[0].content)).toEqual(CARD);
		expect(envelope).not.toHaveProperty('mentions');
	});

	it('builds the same envelope from a JSON string card', () => {
		const envelope = buildAdaptiveCardMessage.call(ctx, JSON.stringify(CARD), 0);

		expect(JSON.parse(envelope.attachments[0].content)).toEqual(CARD);
	});

	it('uses a fresh UUID for each envelope', () => {
		const first = buildAdaptiveCardMessage.call(ctx, CARD, 0);
		const second = buildAdaptiveCardMessage.call(ctx, CARD, 0);

		expect(first.attachments[0].id).not.toBe(second.attachments[0].id);
		expect(first.body.content).toContain(first.attachments[0].id);
		expect(second.body.content).toContain(second.attachments[0].id);
	});

	it('rejects invalid JSON', () => {
		expect(() => buildAdaptiveCardMessage.call(ctx, '{not json', 3)).toThrow(
			'The adaptive card must be valid JSON',
		);
	});

	it.each([
		['null', 'null'],
		['an array', '[1]'],
	])('rejects %s', (_label, input) => {
		expect(() => buildAdaptiveCardMessage.call(ctx, input, 0)).toThrow(
			'The adaptive card must be a JSON object',
		);
	});

	it('rejects a card without type AdaptiveCard', () => {
		expect(() => buildAdaptiveCardMessage.call(ctx, { type: 'Other' }, 0)).toThrow(
			'The adaptive card must have type "AdaptiveCard"',
		);
		expect(() => buildAdaptiveCardMessage.call(ctx, { body: [] }, 0)).toThrow(
			'The adaptive card must have type "AdaptiveCard"',
		);
	});

	it('rejects an envelope larger than 100 KB', () => {
		const big = { type: 'AdaptiveCard', padding: 'x'.repeat(102400) };

		expect(() => buildAdaptiveCardMessage.call(ctx, big, 0)).toThrow(
			'The adaptive card is larger than the 100 KB limit',
		);
	});

	it('stamps the item index on errors', () => {
		let error: unknown;

		try {
			buildAdaptiveCardMessage.call(ctx, '{not json', 7);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).context.itemIndex).toBe(7);
	});
});
