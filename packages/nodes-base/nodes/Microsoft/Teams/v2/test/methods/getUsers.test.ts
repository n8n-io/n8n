import type { ILoadOptionsFunctions, INode, INodeProperties } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../MicrosoftTeamsV2.node';
import { getUsers } from '../../methods/listSearch';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper.
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// The general shape of `getUsers` (query, escaping, pagination, labelling) is pinned in
// `listSearch.test.ts`. This file covers only what the mention work added on top.
describe('Microsoft Teams v2, getUsers additions for mentions', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.getNodeParameter.mockImplementation(
			(name: string, _i?: number, fallback?: unknown) =>
				(name === 'authentication' ? 'microsoftOAuth2Api' : fallback) as never,
		);
		apiRequest.mockResolvedValue({ value: [] });
	});

	const searchOf = () => apiRequest.mock.calls[0][3].$search as string | undefined;

	// A guest's `mail` differs from their principal name, and the mail is the address people
	// know, so the picker has to match on it as well.
	it('searches mail alongside display name and principal name', async () => {
		await getUsers.call(ctx, 'jan');

		expect(searchOf()).toBe('"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"');
	});

	// `&` and `#` cannot be escaped or encoded away: Graph re-splits the query string after
	// percent-decoding, so they truncate the expression and 400 the whole call. Verified on a
	// live tenant, where typing `&` into the picker returned "Could not load list".
	it.each([
		['j&an', 'jan'],
		['j#an', 'jan'],
		['a&b#c', 'abc'],
	])('drops %j from the search term, leaving %j', async (filter, term) => {
		await getUsers.call(ctx, filter);

		expect(searchOf()).toBe(
			`"displayName:${term}" OR "mail:${term}" OR "userPrincipalName:${term}"`,
		);
	});

	it('omits $search entirely when only unusable characters were given', async () => {
		await getUsers.call(ctx, '&#');

		expect(searchOf()).toBeUndefined();
	});

	// An unexpected response shape is not an empty directory: returning the next-page token
	// would offer "load more" into nothing.
	it('returns no results and no token when Graph replies without a value array', async () => {
		apiRequest.mockResolvedValue({ '@odata.nextLink': 'https://graph.microsoft.com/next' });

		await expect(getUsers.call(ctx)).resolves.toEqual({
			results: [],
			paginationToken: undefined,
		});
	});
});

describe('Microsoft Teams v2, mention picker wiring', () => {
	const mentionUserRlc = (resource: string, operation = 'create') => {
		const mentions = versionDescription.properties.find(
			(property) =>
				property.name === 'mentions' &&
				property.displayOptions?.show?.resource?.includes(resource) &&
				property.displayOptions?.show?.operation?.includes(operation),
		);
		const row = (mentions?.options ?? [])[0] as { values: INodeProperties[] };
		return row?.values?.find((value) => value.name === 'userId');
	};

	it.each([
		['channelMessage', 'create'],
		['channelMessage', 'reply'],
		['chatMessage', 'create'],
	])('%s %s offers a user picker backed by getUsers', (resource, operation) => {
		const listMode = mentionUserRlc(resource, operation)?.modes?.find(
			(mode) => mode.name === 'list',
		);

		expect(listMode?.typeOptions?.searchListMethod).toBe('getUsers');
		expect(new MicrosoftTeamsV2(versionDescription).methods.listSearch).toHaveProperty('getUsers');
	});

	it('leaves the By ID mode without an extractValue', () => {
		const byId = mentionUserRlc('channelMessage')?.modes?.find((mode) => mode.name === 'id');

		expect(byId).toBeDefined();
		// An extract regex runs before node code and rejects the email address an AI agent emits
		// when it cannot know which mode is selected.
		expect(byId?.extractValue).toBeUndefined();
	});

	it('accepts a non-v4 Entra user ID in the By ID mode', () => {
		const byId = mentionUserRlc('channelMessage')?.modes?.find((mode) => mode.name === 'id');
		const { regex } = (byId?.validation?.[0] as unknown as { properties: { regex: string } })
			.properties;

		expect(new RegExp(regex).test('714c1202-cbac-10ff-c160-53ab5c4df9b8')).toBe(true);
	});
});
