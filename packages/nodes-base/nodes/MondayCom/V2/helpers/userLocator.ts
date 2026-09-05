import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { SEARCH_MAX_LIMIT } from './accountSearch';
import { normalizeIdList } from './filterOptions';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared User selector. Enterprise accounts hold 10k+ users, so the From
 * List mode searches server-side — never a full dump. A typed search term
 * goes to the cross-entity search API (search.users): fuzzy, and ranked by
 * relevance TO THE CURRENT USER (teammates first), which beats the literal
 * users(name:) match. Search results are capped at 20 by the API (top-N by
 * relevance, no pagination); a more specific term narrows the candidates.
 */
export const userResourceLocator: INodeProperties = {
	displayName: 'User',
	name: 'userId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The user to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchUsers',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 12345678',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'The user ID must be a number',
					},
				},
			],
		},
	],
};

/** Initial window and page size of every user search — the "top 100". */
const USERS_PAGE_SIZE = 100;

interface UserSearchRow {
	id: string;
	name: string;
	email?: string | null;
	url?: string;
}

/** A search.users result row: indexed snapshot + optional live entity. */
interface UserSearchApiResult {
	id: string;
	indexed_data?: { name?: string | null; email?: string | null } | null;
	live_data?: UserSearchRow | null;
}

/** "Name (email)" labels, identical on the browse and search paths. */
function formatUserLabel(user: { name?: string | null; email?: string | null }): string {
	const name = user.name ?? '';
	return user.email ? `${name} (${user.email})` : name;
}

/**
 * Search path: one search.users request — fuzzy matching on name/email,
 * ranked by relevance to the CURRENT user (frequent collaborators first),
 * which users(name:) cannot do. Hard-capped at 20 results with no
 * pagination (per the search API reference); a more specific term narrows
 * the candidates. Rows with null live_data (deactivated, inaccessible, or
 * index lag) are kept on their indexed_data — the user may well be
 * selectable, and dropping them would hide legitimate results.
 */
async function searchUsersViaSearchApi(
	client: MondayGraphQLClient,
	query: string,
): Promise<UserSearchApiResult[]> {
	const data = await client.execute(
		`query ($q: String!, $limit: Int) {
			search {
				users(query: $q, limit: $limit) {
					results {
						id
						indexed_data { name email }
						live_data { id name email url }
					}
				}
			}
		}`,
		0,
		{ q: query, limit: SEARCH_MAX_LIMIT },
	);

	const container = (data.search as { users?: { results?: UserSearchApiResult[] } } | undefined)
		?.users;
	return container?.results ?? [];
}

/**
 * listSearch method for the user picker — hybrid, same pattern as
 * searchBoards:
 * - Filter typed → server-side fuzzy search via search.users
 *   (searchUsersViaSearchApi above), relevance-ranked for the current user.
 * - No filter → browse mode: pages through users 100 at a time.
 */
export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const client = new MondayGraphQLClient(this);

	const query = filter?.trim();
	if (query) {
		const results = (await searchUsersViaSearchApi(client, query)).map((result) => ({
			name: result.live_data
				? formatUserLabel(result.live_data)
				: formatUserLabel({
						name: result.indexed_data?.name ?? String(result.id),
						email: result.indexed_data?.email,
					}),
			value: String(result.id),
			url: result.live_data?.url,
		}));
		// No paginationToken: the search API returns top-N only.
		return { results };
	}

	const page = paginationToken ? Number.parseInt(paginationToken, 10) : 1;

	const data = await client.execute(
		`query ($limit: Int!, $page: Int!) {
			users(limit: $limit, page: $page) {
				id
				name
				email
				url
			}
		}`,
		0,
		{ limit: USERS_PAGE_SIZE, page },
	);

	const users = (data.users ?? []) as UserSearchRow[];

	return {
		results: users.map((user) => ({
			name: formatUserLabel(user),
			value: user.id,
			url: user.url,
		})),
		paginationToken: users.length === USERS_PAGE_SIZE ? String(page + 1) : undefined,
	};
}

interface TeamRow {
	id: string;
	name: string;
}

/**
 * loadOptions method for team pickers. Teams are a bounded collection
 * (unlike users), so a single full listing is safe.
 */
export async function getTeamsList(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = new MondayGraphQLClient(this);
	const data = await client.execute('query { teams { id name } }', 0);

	return ((data.teams ?? []) as TeamRow[])
		.map((team) => ({ name: team.name, value: team.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * listSearch method for pickers that accept users AND teams in one list
 * (e.g. Board: Create owners/subscribers — the API takes separate user and
 * team ID arguments, so result values are prefixed `user:`/`team:` and split
 * at execute time by splitUserTeamIds). Hybrid like searchUsers: a typed
 * filter searches users via search.users (fuzzy, relevance-ranked, capped
 * at 20 by the API, no pagination); unfiltered browse pages users 100 at a
 * time. Teams are a bounded collection, fetched once (first page / search
 * request only) and filtered client-side. Teams are labeled "Name (Team)",
 * users "Name (User · email)".
 */
export async function searchUsersAndTeams(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const client = new MondayGraphQLClient(this);

	const query = filter?.trim();
	if (query) {
		const [userResults, teamsData] = await Promise.all([
			searchUsersViaSearchApi(client, query),
			client.execute('query { teams { id name } }', 0),
		]);

		const filterText = query.toLowerCase();
		const teams = ((teamsData.teams ?? []) as TeamRow[]).filter((team) =>
			team.name.toLowerCase().includes(filterText),
		);

		return {
			results: [
				...teams
					.map((team) => ({ name: `${team.name} (Team)`, value: `team:${team.id}` }))
					.sort((a, b) => a.name.localeCompare(b.name)),
				...userResults.map((result) => {
					const user = result.live_data ?? result.indexed_data;
					const name = user?.name ?? String(result.id);
					return {
						name: user?.email ? `${name} (User · ${user.email})` : `${name} (User)`,
						value: `user:${result.id}`,
					};
				}),
			],
			// No paginationToken: the search API returns top-N only.
		};
	}

	const page = paginationToken ? Number.parseInt(paginationToken, 10) : 1;

	const requests: [Promise<IDataObject>, Promise<IDataObject> | undefined] = [
		client.execute(
			`query ($limit: Int!, $page: Int!) {
				users(limit: $limit, page: $page) { id name email }
			}`,
			0,
			{ limit: USERS_PAGE_SIZE, page },
		),
		// Teams ride on the first page only — later pages are user overflow.
		page === 1 ? client.execute('query { teams { id name } }', 0) : undefined,
	];
	const [usersData, teamsData] = await Promise.all(requests);

	const users = (usersData.users ?? []) as UserSearchRow[];
	const teams = (teamsData?.teams ?? []) as TeamRow[];

	return {
		results: [
			...teams
				.map((team) => ({ name: `${team.name} (Team)`, value: `team:${team.id}` }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			...users.map((user) => ({
				name: user.email ? `${user.name} (User · ${user.email})` : `${user.name} (User)`,
				value: `user:${user.id}`,
			})),
		],
		paginationToken: users.length === USERS_PAGE_SIZE ? String(page + 1) : undefined,
	};
}

/** One resourceLocator row of a multi-user picker (see buildUserRowsProperty). */
function buildUserRowLocator(includeTeams: boolean): INodeProperties {
	return {
		displayName: includeTeams ? 'User or Team' : 'User',
		name: 'user',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: includeTeams ? 'searchUsersAndTeams' : 'searchUsers',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: includeTeams ? 'e.g. 12345678 or team:1234567' : 'e.g. 12345678',
			},
		],
	};
}

export interface UserRowsPropertyOptions {
	displayName: string;
	name: string;
	description: string;
	/** Also list teams (values prefixed `team:`, users `user:`). */
	includeTeams?: boolean;
	displayOptions?: INodeProperties['displayOptions'];
	hint?: string;
}

/**
 * Builds a multi-user picker as a fixedCollection of resourceLocator rows —
 * the only n8n construct that gives a multi-select SERVER-side search
 * (multiOptions dropdowns load one bounded list and filter in the browser,
 * which cannot scale to 10k+ user accounts). Each row searches the backend
 * as the user types; expression mode still accepts a CSV of IDs on the
 * whole parameter (see extractUserRowIds).
 */
export function buildUserRowsProperty(options: UserRowsPropertyOptions): INodeProperties {
	return {
		displayName: options.displayName,
		name: options.name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: options.includeTeams ? 'Add User or Team' : 'Add User',
		default: {},
		description: options.description,
		hint: options.hint,
		...(options.displayOptions ? { displayOptions: options.displayOptions } : {}),
		options: [
			{
				displayName: 'Entries',
				name: 'rows',
				values: [buildUserRowLocator(options.includeTeams === true)],
			},
		],
	};
}

/**
 * Reads a resourceLocator value nested inside a collection (where
 * getNodeParameter's extractValue option cannot reach) into a plain ID.
 * Accepts a bare string from expression mode.
 */
export function extractUserLocatorId(value: unknown): string | undefined {
	const raw =
		value && typeof value === 'object'
			? String((value as IDataObject).value ?? '')
			: String(value ?? '');
	return raw.trim() || undefined;
}

/**
 * Reads a buildUserRowsProperty value into an ID array. Rows hold
 * resourceLocator values ({ mode, value }); expression mode may set the
 * whole parameter to a CSV string or an ID array instead (the same escape
 * hatch the old multiOptions pickers had). Combined users+teams pickers
 * yield `user:`/`team:`-prefixed IDs from the list mode; bare IDs (By ID
 * mode or expressions) pass through for splitUserTeamIds to treat as users.
 */
export function extractUserRowIds(value: unknown): string[] {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const rows = (value as IDataObject).rows;
		if (!Array.isArray(rows)) return [];
		return rows
			.map((row) => {
				const locator = (row as IDataObject)?.user;
				if (locator && typeof locator === 'object') {
					return String((locator as IDataObject).value ?? '').trim();
				}
				return String(locator ?? '').trim();
			})
			.filter((id) => id !== '');
	}
	return normalizeIdList(value);
}

/**
 * Splits a combined users+teams selection into separate user and team ID
 * lists. Dropdown values carry `user:`/`team:` prefixes; expression-mode CSV
 * may pass bare numeric IDs, which are treated as USER IDs — that keeps
 * workflows saved with the old CSV-of-user-IDs fields working unchanged.
 */
export function splitUserTeamIds(ids: string[]): { userIds: string[]; teamIds: string[] } {
	const userIds: string[] = [];
	const teamIds: string[] = [];
	for (const id of ids) {
		if (id.startsWith('team:')) {
			teamIds.push(id.slice('team:'.length));
		} else if (id.startsWith('user:')) {
			userIds.push(id.slice('user:'.length));
		} else {
			userIds.push(id);
		}
	}
	return { userIds, teamIds };
}
