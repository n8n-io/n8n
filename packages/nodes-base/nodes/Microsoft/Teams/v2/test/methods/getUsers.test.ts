/* eslint-disable n8n-nodes-base/node-param-description-lowercase-first-char */
/* eslint-disable n8n-nodes-base/node-param-option-description-identical-to-name */
// The picker-result fixtures below carry a `description` (the UPN), which the node-param
// linters read as node parameter copy.
import type { ILoadOptionsFunctions, INode, INodeProperties } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../MicrosoftTeamsV2.node';
import { getUsers } from '../../methods/listSearch';
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

const FIRST_PAGE_QS = {
	$select: 'id,displayName,userPrincipalName',
	$top: 100,
	$orderby: 'displayName',
};
const HEADERS = { ConsistencyLevel: 'eventual' };

describe('Microsoft Teams v2, getUsers', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
	});

	it('lists the first page of users and maps them to name, value and UPN description', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: 'guid-1', displayName: 'Jane Smith', userPrincipalName: 'jane@example.com' }],
		});

		const result = await getUsers.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users',
			{},
			FIRST_PAGE_QS,
			undefined,
			HEADERS,
		);
		expect(result).toEqual({
			results: [
				{ name: 'Jane Smith (jane@example.com)', value: 'guid-1', description: 'jane@example.com' },
			],
			paginationToken: undefined,
		});
	});

	// Graph rejects the whole $search expression for `"` `\` `&` `#`, so each is dropped and the
	// search still runs. `&`/`#` matter because Graph re-splits the query string after
	// percent-decoding, so encoding them is not enough (live-tenant verified 2026-09-02).
	it.each([
		['jan', '"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"'],
		['"jan"', '"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"'],
		['j&an', '"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"'],
		['j#an', '"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"'],
		['j\\an', '"displayName:jan" OR "mail:jan" OR "userPrincipalName:jan"'],
	])('searches display name, mail and UPN for the filter %j', async (filter, search) => {
		apiRequest.mockResolvedValue({ value: [] });

		await getUsers.call(ctx, filter);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/users',
			{},
			{ ...FIRST_PAGE_QS, $search: search },
			undefined,
			HEADERS,
		);
	});

	it.each(['"""', '   ', '&#\\'])(
		'omits $search when the filter %j has nothing left to search for',
		async (filter) => {
			apiRequest.mockResolvedValue({ value: [] });

			await getUsers.call(ctx, filter);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/users',
				{},
				FIRST_PAGE_QS,
				undefined,
				HEADERS,
			);
		},
	);

	it('follows the next-page link and sends no query params alongside it', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/users?$skiptoken=p2';
		apiRequest.mockResolvedValue({
			value: [],
			'@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?$skiptoken=p3',
		});

		const result = await getUsers.call(ctx, undefined, nextLink);

		expect(apiRequest).toHaveBeenCalledWith('GET', '/v1.0/users', {}, {}, nextLink, HEADERS);
		// Graph's link, never the one we were handed. Echoing that back spins the picker forever.
		expect(result.paginationToken).toBe('https://graph.microsoft.com/v1.0/users?$skiptoken=p3');
	});

	it('stops paginating when Graph returns no next-page link', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		const result = await getUsers.call(
			ctx,
			undefined,
			'https://graph.microsoft.com/v1.0/users?$skiptoken=p2',
		);

		expect(result.paginationToken).toBeUndefined();
	});

	it('returns no results when Graph replies without a value array', async () => {
		apiRequest.mockResolvedValue({
			'@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?$skiptoken=p2',
		});

		const result = await getUsers.call(ctx);

		// An unexpected shape is not an empty directory, so no "load more" into nothing.
		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('falls back to the UPN when a user has an empty display name', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: 'guid-2', displayName: '', userPrincipalName: 'svc@example.com' }],
		});

		const { results } = await getUsers.call(ctx);

		expect(results).toEqual([
			{ name: 'svc@example.com', value: 'guid-2', description: 'svc@example.com' },
		]);
	});

	it('falls back to the user ID when a user has no name at all', async () => {
		apiRequest.mockResolvedValue({
			value: [{ id: 'guid-3', displayName: '', userPrincipalName: '' }],
		});

		const { results } = await getUsers.call(ctx);

		// Without the last rung the row renders blank but stays clickable.
		expect(results.map((user) => user.name)).toEqual(['guid-3']);
	});

	it('keeps the result set and ordering Graph returned', async () => {
		apiRequest.mockResolvedValue({
			value: [
				{ id: 'guid-z', displayName: 'Zoe Quinn', userPrincipalName: 'jan.smith@example.com' },
				{ id: 'guid-a', displayName: 'Ackerman, Janet', userPrincipalName: 'janet@example.com' },
			],
		});

		const { results } = await getUsers.call(ctx, 'jan');

		// Zoe Quinn only matches server-side through her UPN, so appending
		// `filterSortSearchListItems` would drop her; its sort would also flip the pair.
		expect(results.map((r) => r.name)).toEqual([
			'Zoe Quinn (jan.smith@example.com)',
			'Ackerman, Janet (janet@example.com)',
		]);
	});
});

describe('Microsoft Teams v2, mention picker wiring', () => {
	const mentionUserRlc = (resource: string) => {
		const mentions = versionDescription.properties.find(
			(property) =>
				property.name === 'mentions' &&
				property.displayOptions?.show?.resource?.includes(resource) &&
				property.displayOptions?.show?.operation?.includes('create'),
		);
		const row = (mentions?.options ?? [])[0] as { values: INodeProperties[] };
		return row?.values?.find((value) => value.name === 'userId');
	};

	it.each(['channelMessage', 'chatMessage'])(
		'%s create offers a user picker backed by getUsers',
		(resource) => {
			const listMode = mentionUserRlc(resource)?.modes?.find((mode) => mode.name === 'list');

			expect(listMode?.typeOptions?.searchListMethod).toBe('getUsers');
			expect(new MicrosoftTeamsV2(versionDescription).methods.listSearch).toHaveProperty(
				'getUsers',
			);
		},
	);

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
