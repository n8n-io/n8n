/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	buildUserRowsProperty,
	extractUserLocatorId,
	extractUserRowIds,
	getTeamsList,
	searchUsers,
	searchUsersAndTeams,
	splitUserTeamIds,
	userResourceLocator,
} from '../helpers/userLocator';

describe('userResourceLocator', () => {
	it('offers list and id modes with server-side search', () => {
		const modeNames = userResourceLocator.modes?.map((m) => m.name);
		expect(modeNames).toEqual(['list', 'id']);
		const listMode = userResourceLocator.modes?.find((m) => m.name === 'list');
		expect(listMode?.typeOptions?.searchListMethod).toBe('searchUsers');
		expect(listMode?.typeOptions?.searchable).toBe(true);
	});
});

describe('searchUsers', () => {
	let mockContext: any;
	let httpMock: ReturnType<typeof vi.fn>;

	const user = (id: number, name: string, email = `${id}@acme.com`) => ({
		id: String(id),
		name,
		email,
		url: `https://acme.monday.com/users/${id}`,
	});

	beforeEach(() => {
		httpMock = vi.fn();
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
	});

	it('routes a typed filter to search.users — fuzzy, relevance-ranked, capped at 20', async () => {
		httpMock.mockResolvedValue({
			data: {
				search: {
					users: {
						results: [
							{
								id: '1',
								indexed_data: { name: 'Daniel Hai', email: '1@acme.com' },
								live_data: user(1, 'Daniel Hai'),
							},
						],
					},
				},
			},
		});

		const result = await searchUsers.call(mockContext, 'daniel');

		expect(httpMock.mock.calls[0][1].body.query).toContain('search {');
		expect(httpMock.mock.calls[0][1].body.query).toContain('users(query: $q, limit: $limit)');
		expect(httpMock.mock.calls[0][1].body.variables).toEqual({ q: 'daniel', limit: 20 });
		expect(result.results).toEqual([
			{
				name: 'Daniel Hai (1@acme.com)',
				value: '1',
				url: 'https://acme.monday.com/users/1',
			},
		]);
		// No paginationToken: the search API returns top-N only.
		expect(result.paginationToken).toBeUndefined();
	});

	it('keeps search rows with null live_data, falling back to indexed_data', async () => {
		httpMock.mockResolvedValue({
			data: {
				search: {
					users: {
						results: [
							{ id: '9', indexed_data: { name: 'Lagging User', email: null }, live_data: null },
						],
					},
				},
			},
		});

		const result = await searchUsers.call(mockContext, 'lag');

		expect(result.results).toEqual([{ name: 'Lagging User', value: '9', url: undefined }]);
	});

	it('pages 100 at a time via paginationToken when unfiltered', async () => {
		const fullPage = Array.from({ length: 100 }, (_, i) => user(i + 1, `User ${i + 1}`));
		httpMock.mockResolvedValue({ data: { users: fullPage } });

		const result = await searchUsers.call(mockContext, undefined, '2');

		expect(httpMock.mock.calls[0][1].body.query).not.toContain('search {');
		expect(httpMock.mock.calls[0][1].body.variables).toEqual({
			limit: 100,
			page: 2,
		});
		expect(result.paginationToken).toBe('3');
	});

	it('labels users without an email by name only', async () => {
		httpMock.mockResolvedValue({ data: { users: [{ ...user(7, 'Bot'), email: null }] } });

		const result = await searchUsers.call(mockContext);

		expect(result.results[0].name).toBe('Bot');
	});
});

describe('getTeamsList', () => {
	it('lists all teams sorted by name', async () => {
		const httpMock = vi.fn().mockResolvedValue({
			data: {
				teams: [
					{ id: '2', name: 'Zeta' },
					{ id: '1', name: 'Alpha' },
				],
			},
		});
		const mockContext: any = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};

		const options = await getTeamsList.call(mockContext);

		expect(options).toEqual([
			{ name: 'Alpha', value: '1' },
			{ name: 'Zeta', value: '2' },
		]);
	});
});

describe('searchUsersAndTeams', () => {
	const makeContext = () => {
		const httpMock = vi.fn().mockImplementation(async (_cred: string, options: any) => {
			const query = options.body.query as string;
			if (query.includes('teams')) {
				return {
					data: {
						teams: [
							{ id: '10', name: 'Gregoes' },
							{ id: '11', name: 'Alpha Squad' },
						],
					},
				};
			}
			if (query.includes('search {')) {
				return {
					data: {
						search: {
							users: {
								results: [
									{
										id: '1',
										indexed_data: { name: 'Zoe', email: 'zoe@acme.com' },
										live_data: { id: '1', name: 'Zoe', email: 'zoe@acme.com', url: '' },
									},
									{
										id: '2',
										indexed_data: { name: 'Agent Bot', email: null },
										live_data: { id: '2', name: 'Agent Bot', email: null, url: '' },
									},
								],
							},
						},
					},
				};
			}
			return {
				data: {
					users: [
						{ id: '1', name: 'Zoe', email: 'zoe@acme.com' },
						{ id: '2', name: 'Agent Bot', email: null },
					],
				},
			};
		});
		const mockContext: any = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
		return { httpMock, mockContext };
	};

	it('sends the search text to search.users server-side and prefixes values', async () => {
		const { httpMock, mockContext } = makeContext();

		const result = await searchUsersAndTeams.call(mockContext, 'zo');

		const usersCall = httpMock.mock.calls.find((call: any[]) =>
			(call[1].body.query as string).includes('search {'),
		);
		expect(usersCall![1].body.variables).toEqual({ q: 'zo', limit: 20 });
		// Teams are bounded → filtered client-side; users come back as sent
		// (relevance order preserved). No team matches "zo".
		expect(result.results).toEqual([
			{ name: 'Zoe (User · zoe@acme.com)', value: 'user:1' },
			{ name: 'Agent Bot (User)', value: 'user:2' },
		]);
		// No paginationToken on the search path (top-N only).
		expect(result.paginationToken).toBeUndefined();
	});

	it('still lists matching teams alongside searched users', async () => {
		const { mockContext } = makeContext();

		const result = await searchUsersAndTeams.call(mockContext, 'alpha');

		expect(result.results[0]).toEqual({ name: 'Alpha Squad (Team)', value: 'team:11' });
		expect(result.results.slice(1).map((r) => r.value)).toEqual(['user:1', 'user:2']);
	});

	it('lists teams first (client-filtered) on the first page when unfiltered', async () => {
		const { mockContext } = makeContext();

		const result = await searchUsersAndTeams.call(mockContext);

		expect(result.results.slice(0, 2)).toEqual([
			{ name: 'Alpha Squad (Team)', value: 'team:11' },
			{ name: 'Gregoes (Team)', value: 'team:10' },
		]);
		expect(result.results.slice(2).map((r) => r.value)).toEqual(['user:1', 'user:2']);
	});

	it('skips the teams request on follow-up pages', async () => {
		const { httpMock, mockContext } = makeContext();

		const result = await searchUsersAndTeams.call(mockContext, undefined, '2');

		expect(httpMock).toHaveBeenCalledTimes(1);
		expect(result.results.every((r) => String(r.value).startsWith('user:'))).toBe(true);
	});
});

describe('buildUserRowsProperty', () => {
	it('builds a fixedCollection of searchable user resource locators', () => {
		const property = buildUserRowsProperty({
			displayName: 'Users',
			name: 'someUserIds',
			description: 'desc',
		});

		expect(property.type).toBe('fixedCollection');
		expect(property.typeOptions?.multipleValues).toBe(true);
		const row = (property.options?.[0] as any).values[0];
		expect(row.type).toBe('resourceLocator');
		const listMode = row.modes.find((m: any) => m.name === 'list');
		expect(listMode.typeOptions.searchListMethod).toBe('searchUsers');
		expect(listMode.typeOptions.searchable).toBe(true);
	});

	it('uses the combined users+teams search when includeTeams is set', () => {
		const property = buildUserRowsProperty({
			displayName: 'Owners',
			name: 'ownerIds',
			description: 'desc',
			includeTeams: true,
		});

		const row = (property.options?.[0] as any).values[0];
		const listMode = row.modes.find((m: any) => m.name === 'list');
		expect(listMode.typeOptions.searchListMethod).toBe('searchUsersAndTeams');
	});
});

describe('extractUserRowIds', () => {
	it('extracts resourceLocator values from fixedCollection rows', () => {
		expect(
			extractUserRowIds({
				rows: [
					{ user: { __rl: true, mode: 'list', value: '123' } },
					{ user: { __rl: true, mode: 'id', value: 'team:10' } },
					{ user: { __rl: true, mode: 'list', value: '' } },
				],
			}),
		).toEqual(['123', 'team:10']);
	});

	it('accepts a CSV string or array from expression mode', () => {
		expect(extractUserRowIds('1, 2,team:10')).toEqual(['1', '2', 'team:10']);
		expect(extractUserRowIds(['1', '2'])).toEqual(['1', '2']);
	});

	it('returns [] for empty or missing values', () => {
		expect(extractUserRowIds(undefined)).toEqual([]);
		expect(extractUserRowIds({})).toEqual([]);
		expect(extractUserRowIds({ rows: [] })).toEqual([]);
	});
});

describe('extractUserLocatorId', () => {
	it('unwraps a nested resourceLocator value', () => {
		expect(extractUserLocatorId({ __rl: true, mode: 'list', value: '42' })).toBe('42');
	});

	it('passes plain strings through and drops empties', () => {
		expect(extractUserLocatorId('42')).toBe('42');
		expect(extractUserLocatorId('  ')).toBeUndefined();
		expect(extractUserLocatorId(undefined)).toBeUndefined();
		expect(extractUserLocatorId({ __rl: true, mode: 'list', value: '' })).toBeUndefined();
	});
});

describe('splitUserTeamIds', () => {
	it('splits prefixed values into user and team lists', () => {
		expect(splitUserTeamIds(['user:1', 'team:10', 'user:2'])).toEqual({
			userIds: ['1', '2'],
			teamIds: ['10'],
		});
	});

	it('treats bare IDs as user IDs (legacy CSV workflows)', () => {
		expect(splitUserTeamIds(['123', 'team:10', '456'])).toEqual({
			userIds: ['123', '456'],
			teamIds: ['10'],
		});
	});

	it('handles an empty selection', () => {
		expect(splitUserTeamIds([])).toEqual({ userIds: [], teamIds: [] });
	});
});
