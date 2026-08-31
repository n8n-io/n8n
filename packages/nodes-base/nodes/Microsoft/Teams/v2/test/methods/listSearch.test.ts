import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getChats } from '../../methods/listSearch';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// `getChats` retries through `sleep(1000)` between attempts; stub it so the
// retry-count/no-final-sleep assertions below run instantly instead of for real seconds.
vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

// Service Principal guard coverage for `getChats` already lives in
// `../transport/index.test.ts` (`'listSearch credential routing'`), via a different
// mocking layer (low-level HTTP helpers). Not duplicated here.
describe('Microsoft Teams v2 — getChats', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;
	const sleepMock = sleep as unknown as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		setParams({ authentication: 'microsoftOAuth2Api' });
	});

	it('throws a NodeOperationError carrying the original Graph error message when every attempt fails', async () => {
		apiRequest.mockRejectedValue(new Error('Graph is down'));

		await expect(getChats.call(ctx)).rejects.toThrow('Graph is down');
	});

	it('pins the retry count at exactly 5 calls and sleeps exactly 4 times (not 5) on total failure', async () => {
		apiRequest.mockRejectedValue(new Error('boom'));

		await expect(getChats.call(ctx)).rejects.toThrow();
		expect(apiRequest).toHaveBeenCalledTimes(5);
		expect(sleepMock).toHaveBeenCalledTimes(4);
	});

	it('recovers if the first 4 attempts fail, resolving with the parsed chats and no throw', async () => {
		apiRequest
			.mockRejectedValueOnce(new Error('transient 1'))
			.mockRejectedValueOnce(new Error('transient 2'))
			.mockRejectedValueOnce(new Error('transient 3'))
			.mockRejectedValueOnce(new Error('transient 4'))
			.mockResolvedValueOnce({
				value: [{ id: 'c1', topic: 'Standup', chatType: 'Group', webUrl: 'https://teams/chat/c1' }],
			});

		const result = await getChats.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(5);
		expect(sleepMock).toHaveBeenCalledTimes(4);
		expect(result.results).toEqual([
			{ name: 'Standup (Group)', value: 'c1', url: 'https://teams/chat/c1' },
		]);
	});

	it('succeeds on the first attempt with exactly 1 call and no sleep', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await getChats.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(sleepMock).not.toHaveBeenCalled();
	});

	it('returns an empty result for a genuinely empty tenant without throwing', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		const result = await getChats.call(ctx);

		expect(result).toEqual({ results: [] });
	});

	it('builds the chat name from member display names when topic is absent, preserving the chatType suffix', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{
					id: 'c2',
					chatType: 'oneOnOne',
					webUrl: 'https://teams/chat/c2',
					members: [{ displayName: 'Alice' }, { displayName: 'Bob' }, {}],
				},
			],
		});

		const result = await getChats.call(ctx);

		expect(result.results).toEqual([
			{ name: 'Alice, Bob (oneOnOne)', value: 'c2', url: 'https://teams/chat/c2' },
		]);
	});
});
