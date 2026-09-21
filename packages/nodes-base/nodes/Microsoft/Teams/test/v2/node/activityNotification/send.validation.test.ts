import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { createExecuteContext, setParams } from '../helpers';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const RECIPIENT = '11111111-2222-3333-4444-555555555555';
const PATH = `/v1.0/users/${RECIPIENT}/teamwork/sendActivityNotification`;
const LINK = 'https://teams.microsoft.com/l/chat/0/0?users=someone@contoso.com';
const BODY = {
	topic: { source: 'text', value: 'n8n workflow run', webUrl: LINK },
	activityType: 'systemDefault',
	previewText: { content: 'Order #4711 needs approval' },
	templateParameters: [{ name: 'systemDefaultText', value: 'Approval needed' }],
};

const baseParams = {
	authentication: 'microsoftTeamsOAuth2Api',
	resource: 'activityNotification',
	operation: 'send',
	recipientId: RECIPIENT,
	headline: 'Approval needed',
	previewText: 'Order #4711 needs approval',
	topic: 'n8n workflow run',
	topicLink: LINK,
	options: {},
};

describe('Microsoft Teams V2 - activityNotification:send validation', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const request = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		request.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (overrides: Record<string, unknown> = {}) => {
		setParams(ctx, { ...baseParams, ...overrides });
		return await node.execute.call(ctx);
	};

	it.each(['microsoftTeamsOAuth2Api', 'microsoftOAuth2Api', transport.SERVICE_PRINCIPAL_AUTH])(
		"sends the notification body to the recipient's teamwork endpoint under %s",
		async (authentication) => {
			const result = await run({ authentication });

			expect(request).toHaveBeenCalledTimes(1);
			expect(request).toHaveBeenCalledWith('POST', PATH, BODY);
			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
		},
	);

	it('passes a user principal name in By ID mode through to the path', async () => {
		await run({ recipientId: 'jacob@contoso.com' });

		expect(request).toHaveBeenCalledWith(
			'POST',
			'/v1.0/users/jacob%40contoso.com/teamwork/sendActivityNotification',
			BODY,
		);
	});

	it.each([
		[{ chainId: 4711 }, 4711],
		[{ chainId: '4711' }, 4711],
	])('sends the Chain ID from the options %p as a number', async (options, chainId) => {
		await run({ options });

		expect(request).toHaveBeenCalledWith('POST', PATH, { ...BODY, chainId });
	});

	it.each([
		{},
		{ chainId: 0 },
		{ chainId: '' },
		{ chainId: '  ' },
		{ chainId: null },
		{ chainId: undefined },
	])('omits chainId for the options %p', async (options) => {
		await run({ options });

		expect(request).toHaveBeenCalledWith('POST', PATH, BODY);
		expect(request.mock.lastCall?.[2]).not.toHaveProperty('chainId');
	});

	it.each([1.5, -1, 'abc'])(
		'rejects a non-integer or negative Chain ID (%p) before any request',
		async (chainId) => {
			await expect(run({ options: { chainId } })).rejects.toThrow(
				'The Chain ID must be a whole number of 0 or more',
			);
			expect(request).not.toHaveBeenCalled();
		},
	);

	it.each(['12345678901234567890', 1e19, Number.MAX_SAFE_INTEGER + 1])(
		'rejects a Chain ID above the safe integer range (%p) before any request',
		async (chainId) => {
			await expect(run({ options: { chainId } })).rejects.toThrow(
				'The Chain ID is too large to send exactly',
			);
			expect(request).not.toHaveBeenCalled();
		},
	);

	it('rejects an empty topic link before any request', async () => {
		await expect(run({ topicLink: '' })).rejects.toThrow('The Topic Link is required');
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		'https://example.com/l/chat/0/0',
		'http://teams.microsoft.com/l/chat/0/0',
		'https://teams.microsoft.com.evil.example/l/chat/0/0',
		'msteams://l/chat/0/0',
		'not a url',
	])('rejects a link that is not a Teams link (%s) before any request', async (topicLink) => {
		await expect(run({ topicLink })).rejects.toThrow(
			'The Topic Link must be a Microsoft Teams link',
		);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		'https://teams.microsoft.com/l/chat/0/0?users=a@b.com',
		'https://TEAMS.MICROSOFT.COM/l/team/x',
		'https://teams.microsoft.com/meet/9385287521937?p=Zg8SUJqhrJ4gO3ZT1v',
		'https://teams.microsoft.com/_#/conversations/19:abc@thread.tacv2?ctx=channel',
		'https://teams.cloud.microsoft/l/chat/0/0',
		'https://gov.teams.microsoft.us/l/chat/0/0',
		'https://dod.teams.microsoft.us/l/chat/0/0',
		'https://teams.microsoftonline.cn/l/chat/0/0',
	])('accepts the Teams link %s', async (topicLink) => {
		await run({ topicLink });

		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.calls[0][2]).toMatchObject({ topic: { webUrl: topicLink } });
	});

	it.each([
		['headline', 'Headline', ''],
		['headline', 'Headline', '   '],
		['previewText', 'Preview Text', ''],
		['previewText', 'Preview Text', '   '],
		['topic', 'Topic', ''],
		['topic', 'Topic', '   '],
	])('rejects an empty %s (%p) before any request', async (name, label, value) => {
		await expect(run({ [name]: value })).rejects.toThrow(`The ${label} must not be empty`);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['headline', 'Headline'],
		['topicLink', 'Topic Link'],
	])('rejects an object %s value before any request', async (name, label) => {
		await expect(run({ [name]: { a: 1 } })).rejects.toThrow(`The ${label} must be text`);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['', 'No recipient selected'],
		['x/../users/evil', 'The Recipient is not valid'],
	])('rejects the recipient %p before any request', async (recipientId, message) => {
		await expect(run({ recipientId })).rejects.toThrow(message);
		expect(request).not.toHaveBeenCalled();
	});
});
