import { UserError, type ILoadOptionsFunctions, type INode } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getChats, getUsers } from '../../methods/listSearch';
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

	// Faithful to the load-options signature: the SECOND argument is the fallback
	// value (there is no itemIndex), and a read with no fallback and no stored value
	// throws - which is what lets the "no resource or operation" case below fail if
	// the fallback form is ever dropped from `getChats`.
	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
			const value = name in params ? params[name] : fallback;
			if (value === undefined) throw new UserError(`Could not get parameter "${name}"`);
			return value as never;
		});
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
		// `$top: 50` (the endpoint maximum) keeps the Add picker from rendering
		// empty once 1:1 chats are filtered out of a default-sized page.
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/chats',
			{},
			{
				$expand: 'members',
				$top: 50,
			},
		);
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

	describe('one-on-one chats are hidden only for the member operations that cannot use them', () => {
		const mixedChats = {
			value: [
				{ id: 'c1', topic: 'Standup', chatType: 'group', webUrl: 'https://teams/chat/c1' },
				{ id: 'c2', topic: 'Alice', chatType: 'oneOnOne', webUrl: 'https://teams/chat/c2' },
				{ id: 'c3', topic: 'Review', chatType: 'meeting', webUrl: 'https://teams/chat/c3' },
			],
		};

		beforeEach(() => {
			apiRequest.mockResolvedValue(mixedChats);
		});

		it.each(['add'])('hides oneOnOne chats for chatMember:%s', async (operation) => {
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMember',
				operation,
			});

			const result = await getChats.call(ctx);

			expect(result.results.map((r) => r.value)).toEqual(['c3', 'c1']);
		});

		it('keeps group and meeting chats for chatMember:add', async () => {
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMember',
				operation: 'add',
			});

			const result = await getChats.call(ctx);

			expect(result.results.map((r) => r.name)).toEqual(['Review (meeting)', 'Standup (group)']);
		});

		it('keeps oneOnOne chats for chatMember:getAll', async () => {
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMember',
				operation: 'getAll',
			});

			const result = await getChats.call(ctx);

			expect(result.results.map((r) => r.value)).toEqual(['c2', 'c3', 'c1']);
		});

		it('keeps oneOnOne chats for chatMessage', async () => {
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMessage',
				operation: 'create',
			});

			const result = await getChats.call(ctx);

			expect(result.results.map((r) => r.value)).toEqual(['c2', 'c3', 'c1']);
		});

		// Regression guard for the Teams trigger, which shares `getChats` but has
		// neither a `resource` nor an `operation` parameter: both reads must keep the
		// fallback form or the picker throws instead of listing chats.
		it('keeps oneOnOne chats when the node has no resource or operation parameter', async () => {
			setParams({ authentication: 'microsoftOAuth2Api' });

			const result = await getChats.call(ctx);

			expect(result.results.map((r) => r.value)).toEqual(['c2', 'c3', 'c1']);
		});

		// Only one page is fetched, so the message must describe this list, never claim the
		// account has no group chats: a full page of 1:1 chats can still be followed by
		// group chats the picker never asked for.
		it('explains the empty list without claiming the account has no group chats', async () => {
			apiRequest.mockResolvedValue({
				value: Array.from({ length: 50 }, (_, i) => ({
					id: `c${i}`,
					topic: `Person ${i}`,
					chatType: 'oneOnOne',
					webUrl: `https://teams/chat/c${i}`,
				})),
				'@odata.nextLink': 'https://graph.microsoft.com/v1.0/chats?$skiptoken=x',
			});
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMember',
				operation: 'add',
			});

			await expect(getChats.call(ctx)).rejects.toThrow('No group chats available to select');
		});

		// The message must not fire when the tenant simply has no chats, or it would
		// blame the 1:1 filter for an unrelated empty state.
		it('stays silent for an empty page even on chatMember:add', async () => {
			apiRequest.mockResolvedValue({ value: [] });
			setParams({
				authentication: 'microsoftOAuth2Api',
				resource: 'chatMember',
				operation: 'add',
			});

			await expect(getChats.call(ctx)).resolves.toEqual({ results: [] });
		});
	});
});

describe('Microsoft Teams v2 - getUsers', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		apiRequest.mockResolvedValue({ value: [] });
	});

	it('requests only $select when no filter is given, with ConsistencyLevel: eventual', async () => {
		await getUsers.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users',
			{},
			{ $select: 'id,displayName,userPrincipalName' },
			undefined,
			{ ConsistencyLevel: 'eventual' },
		);
	});

	it('builds the $search string exactly', async () => {
		apiRequest.mockResolvedValue({
			value: [],
			'@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?$skiptoken=abc',
		});

		const result = await getUsers.call(ctx, 'ann');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users',
			{},
			{
				$select: 'id,displayName,userPrincipalName',
				$search: '"displayName:ann" OR "userPrincipalName:ann"',
			},
			undefined,
			{ ConsistencyLevel: 'eventual' },
		);
		expect(result.paginationToken).toBe('https://graph.microsoft.com/v1.0/users?$skiptoken=abc');
	});

	it('backslash-escapes double quotes and backslashes in the search term', async () => {
		await getUsers.call(ctx, 'a"b\\c');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users',
			{},
			{
				$select: 'id,displayName,userPrincipalName',
				$search: '"displayName:a\\"b\\\\c" OR "userPrincipalName:a\\"b\\\\c"',
			},
			undefined,
			{ ConsistencyLevel: 'eventual' },
		);
	});

	it('follows a paginationToken URL verbatim (no endpoint, no query) and still sends ConsistencyLevel', async () => {
		await getUsers.call(ctx, undefined, 'https://graph.microsoft.com/v1.0/users?$skiptoken=abc');

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'',
			{},
			{},
			'https://graph.microsoft.com/v1.0/users?$skiptoken=abc',
			{ ConsistencyLevel: 'eventual' },
		);
	});

	it('labels entries "Display Name (upn)", uses the user id as value, and sorts by display name', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'u2', displayName: 'Zoe Brown', userPrincipalName: 'zoe@contoso.com' },
				{ id: 'u1', displayName: 'Ann Smith', userPrincipalName: 'ann@contoso.com' },
			],
		});

		const result = await getUsers.call(ctx);

		expect(result.results).toEqual([
			{ name: 'Ann Smith (ann@contoso.com)', value: 'u1' },
			{ name: 'Zoe Brown (zoe@contoso.com)', value: 'u2' },
		]);
	});
});
