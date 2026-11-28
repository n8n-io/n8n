import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
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
const TEAM_ID = '1111-2222-3333';
const CHANNEL_ID = '42:aaabbbccc.tacv2';

describe('Test MicrosoftTeamsV2, channelMessage => create adaptive card with makeReply', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		apiRequest.mockResolvedValue({ id: 'sent' });
	});

	const setCreateParams = (options: Record<string, unknown>) =>
		setParams(ctx, {
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'channelMessage',
			operation: 'create',
			teamId: TEAM_ID,
			channelId: CHANNEL_ID,
			contentType: 'adaptiveCard',
			adaptiveCard: CARD,
			options,
		});

	it('rejects an adaptive card reply through makeReply', async () => {
		setCreateParams({ makeReply: '1698324478896' });

		let error: unknown;
		try {
			await node.execute.call(ctx);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).message).toBe(
			'Adaptive cards cannot be sent as a reply from the Create operation',
		);
		expect((error as NodeOperationError).description).toContain('Reply operation');
		expect((error as NodeOperationError).context.itemIndex).toBe(0);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('posts a top-level adaptive card when makeReply is absent', async () => {
		setCreateParams({});

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		const [method, endpoint, body] = apiRequest.mock.calls[0];
		expect(method).toBe('POST');
		expect(String(endpoint)).toBe(`/beta/teams/${TEAM_ID}/channels/${CHANNEL_ID}/messages`);

		const envelope = body as ChatMessageBody;
		expect(envelope.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
	});
});
