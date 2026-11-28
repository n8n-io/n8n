import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
import type * as transportModule from '../../../../v2/transport';
import type { ChatMessageBody } from '../../../../v2/helpers/adaptiveCard';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof transportModule>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const CARD = {
	type: 'AdaptiveCard',
	version: '1.4',
	body: [{ type: 'TextBlock', text: 'Hello from a card' }],
};
const CHAT_ID = '19:abc@thread.v2';

describe('Test MicrosoftTeamsV2, chatMessage => create adaptive card from an object', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		apiRequest.mockResolvedValue({ id: 'sent' });
	});

	it('posts the envelope when the card is an object', async () => {
		setParams(ctx, {
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'chatMessage',
			operation: 'create',
			chatId: CHAT_ID,
			contentType: 'adaptiveCard',
			adaptiveCard: CARD,
		});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		const [method, endpoint, body] = apiRequest.mock.calls[0];
		expect(method).toBe('POST');
		expect(String(endpoint)).toBe(`/v1.0/chats/${CHAT_ID}/messages`);

		const envelope = body as ChatMessageBody;
		const match = /^<attachment id="([0-9a-f-]{36})"><\/attachment>$/.exec(envelope.body.content);
		expect(match).not.toBeNull();
		expect(envelope.body.contentType).toBe('html');
		expect(envelope.attachments).toHaveLength(1);
		expect(envelope.attachments[0].id).toBe(match?.[1]);
		expect(envelope.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
		expect(envelope.attachments[0].contentUrl).toBeNull();
		expect(JSON.parse(envelope.attachments[0].content)).toEqual(CARD);
		expect(envelope).not.toHaveProperty('mentions');
	});
});
