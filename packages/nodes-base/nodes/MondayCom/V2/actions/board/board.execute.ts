import { NodeOperationError, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';

import {
	AggregateInputError,
	buildAggregateQueryPlan,
	parseAggregateResults,
	type AggregateApiResponse,
	type AggregateCalculationRow,
	type AggregateQueryPlan,
} from '../../helpers/aggregate';
import { isRealBoard } from '../../helpers/boardLocator';
import { fetchColumns } from '../../helpers/columnMapper';
import { normalizeIdList, toIso8601 } from '../../helpers/filterOptions';
import {
	buildFilterRules,
	findUnsupportedOperatorRules,
	formatUnsupportedOperatorMessage,
	type FilterRuleInput,
} from '../../helpers/itemFilters';
import { getBoardHierarchyType, MULTI_LEVEL_AGGREGATE_NOTE } from '../../helpers/multiLevel';
import { extractUserRowIds, splitUserTeamIds } from '../../helpers/userLocator';
import { extractWorkspaceId } from '../../helpers/workspaceLocator';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { safeJsonParse } from '../item/item.execute';

const BOARD_BASE_FIELDS = [
	'id',
	'name',
	'state',
	'board_kind',
	'type',
	'url',
	'description',
	'items_count',
	'item_terminology',
	'created_at',
	'updated_at',
	'board_folder_id',
	'folder { id name }',
	'workspace { id name }',
];

/** Structural fields only Board: Get returns — too heavy for a list. */
const BOARD_STRUCTURE_FIELDS = [
	'owners { id name email }',
	'groups { id title color position }',
	'columns { id title type settings_str }',
];

/**
 * The opt-in "Include Complete Board Data" field set. Each of these adds
 * complexity cost and latency per board, so they stay behind the toggle.
 */
const BOARD_COMPLETE_FIELDS = [
	'access_level',
	'permissions',
	'items_limit',
	'hierarchy_type',
	'created_from_board_id',
	'communication',
	'top_group { id title color position }',
	'subscribers { id name email }',
	'team_subscribers { id name }',
	'tags { id name color }',
	'inferred_metadata { item_type }',
	'manual_metadata { board_md }',
];

/** Builds the GraphQL field selection for the board read operations. */
export function buildBoardFieldSelection(options: {
	includeStructure?: boolean;
	includeCompleteData?: boolean;
}): string {
	return [
		...BOARD_BASE_FIELDS,
		...(options.includeStructure ? BOARD_STRUCTURE_FIELDS : []),
		...(options.includeCompleteData ? BOARD_COMPLETE_FIELDS : []),
	].join('\n');
}

/**
 * Board: Duplicate — duplicate_board. The API wraps the result in a
 * BoardDuplication object ({ board, is_async }); large boards may be
 * duplicated asynchronously, in which case is_async is true and the board
 * may still be filling up when the response returns.
 */
export async function duplicateBoard(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const duplicateType = this.getNodeParameter('duplicateType', itemIndex) as string;
	const options = this.getNodeParameter('duplicateBoardOptions', itemIndex, {}) as IDataObject;

	const varDefs = ['$boardId: ID!', '$duplicateType: DuplicateBoardType!'];
	const args = ['board_id: $boardId', 'duplicate_type: $duplicateType'];
	const variables: Record<string, unknown> = { boardId, duplicateType };

	if (options.boardName) {
		varDefs.push('$boardName: String');
		args.push('board_name: $boardName');
		variables.boardName = options.boardName;
	}
	// Resource locator nested in a collection — see extractWorkspaceId.
	const duplicateWorkspaceId = extractWorkspaceId(options.workspaceId);
	if (duplicateWorkspaceId) {
		varDefs.push('$workspaceId: ID');
		args.push('workspace_id: $workspaceId');
		variables.workspaceId = duplicateWorkspaceId;
	}
	if (options.folderId) {
		varDefs.push('$folderId: ID');
		args.push('folder_id: $folderId');
		variables.folderId = options.folderId;
	}
	if (options.keepSubscribers === true) {
		args.push('keep_subscribers: true');
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			duplicate_board(${args.join(', ')}) {
				is_async
				board {
					id
					name
					state
					board_kind
					url
					workspace { id name }
				}
			}
		}`,
		itemIndex,
		variables,
	);

	const duplication = (data.duplicate_board ?? {}) as IDataObject & { board?: IDataObject };
	return { ...(duplication.board ?? {}), isAsync: duplication.is_async ?? false };
}

/**
 * Computes what Replace mode must remove: current members (users and teams,
 * both roles — owners are a subset of subscribers in the API) that are not in
 * the desired selection. The executing user is never removed — the API
 * silently keeps their ownership anyway (verified live), so removing them
 * would only produce a confusing half-applied state.
 */
export function buildReplacePlan(
	current: {
		subscribers?: SubscriberEntity[];
		owners?: SubscriberEntity[];
		team_subscribers?: SubscriberEntity[];
		team_owners?: SubscriberEntity[];
	},
	desiredUserIds: string[],
	desiredTeamIds: string[],
	executingUserId: string,
): { removeUserIds: string[]; removeTeamIds: string[]; keptExecutingUser: boolean } {
	const desiredUsers = new Set(desiredUserIds);
	const desiredTeams = new Set(desiredTeamIds);

	const currentUserIds = new Set<string>();
	for (const user of [...(current.subscribers ?? []), ...(current.owners ?? [])]) {
		if (user.id) currentUserIds.add(String(user.id));
	}
	const currentTeamIds = new Set<string>();
	for (const team of [...(current.team_subscribers ?? []), ...(current.team_owners ?? [])]) {
		if (team.id) currentTeamIds.add(String(team.id));
	}

	let keptExecutingUser = false;
	const removeUserIds: string[] = [];
	for (const id of currentUserIds) {
		if (desiredUsers.has(id)) continue;
		if (id === executingUserId) {
			keptExecutingUser = true;
			continue;
		}
		removeUserIds.push(id);
	}
	const removeTeamIds = [...currentTeamIds].filter((id) => !desiredTeams.has(id));

	return { removeUserIds, removeTeamIds, keptExecutingUser };
}

/**
 * Board: Update Subscribers — one operation with an Add/Remove Action
 * selector. Add = add_users_to_board/add_teams_to_board (with
 * subscriber-vs-owner kind), Remove = delete_subscribers_from_board/
 * delete_teams_from_board. Users and teams each need their own mutation;
 * all selections run in one request via aliases. Add supports two modes:
 * Append (default — just add) and Replace (read current membership, delete
 * everyone not selected, then add — re-adding an existing member with a
 * different kind changes their role, verified live).
 */
export async function changeBoardSubscribers(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const userIds = extractUserRowIds(this.getNodeParameter('subscriberUserIds', itemIndex, {}));
	const teamIds = normalizeIdList(this.getNodeParameter('subscriberTeamIds', itemIndex, []));

	if (userIds.length === 0 && teamIds.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select at least one user or team', {
			itemIndex,
		});
	}

	const action = this.getNodeParameter('subscribersAction', itemIndex, 'add') as string;
	const removing = action === 'remove';
	// The explicit fallbacks matter: params hidden by the Action selector
	// have no stored value in the workflow JSON.
	const kind = removing
		? undefined
		: (this.getNodeParameter('subscriberKind', itemIndex, 'subscriber') as string);
	const options = removing
		? {}
		: (this.getNodeParameter('updateSubscribersOptions', itemIndex, {}) as IDataObject);
	const replacing = options.mode === 'replace';

	// Replace needs the current membership (to diff) and the executing user
	// (never removed — the API silently preserves their ownership anyway).
	let replacePlan: ReturnType<typeof buildReplacePlan> | undefined;
	if (replacing) {
		const current = await client.execute(
			`query ($ids: [ID!]) {
				me { id }
				boards(ids: $ids) {
					subscribers { id }
					owners { id }
					team_subscribers { id }
					team_owners { id }
				}
			}`,
			itemIndex,
			{ ids: [boardId] },
		);
		const board = ((current.boards ?? []) as Array<Parameters<typeof buildReplacePlan>[0]>)[0];
		if (!board) {
			throw new NodeOperationError(this.getNode(), `Board ${boardId} not found`, { itemIndex });
		}
		const meId = String(((current.me ?? {}) as IDataObject).id ?? '');
		replacePlan = buildReplacePlan(board, userIds, teamIds, meId);
	}

	const varDefs = ['$boardId: ID!'];
	const selections: string[] = [];
	const variables: Record<string, unknown> = { boardId };

	// Deletions go first: top-level mutation fields run serially, so the adds
	// below see the post-removal state.
	if (replacePlan && replacePlan.removeUserIds.length > 0) {
		varDefs.push('$removeUserIds: [ID!]!');
		variables.removeUserIds = replacePlan.removeUserIds;
		selections.push(
			'removedUsers: delete_subscribers_from_board(board_id: $boardId, user_ids: $removeUserIds) { id name email }',
		);
	}
	if (replacePlan && replacePlan.removeTeamIds.length > 0) {
		varDefs.push('$removeTeamIds: [ID!]!');
		variables.removeTeamIds = replacePlan.removeTeamIds;
		selections.push(
			'removedTeams: delete_teams_from_board(board_id: $boardId, team_ids: $removeTeamIds) { id name }',
		);
	}
	if (userIds.length > 0) {
		varDefs.push('$userIds: [ID!]!');
		variables.userIds = userIds;
		selections.push(
			removing
				? 'users: delete_subscribers_from_board(board_id: $boardId, user_ids: $userIds) { id name email }'
				: `users: add_users_to_board(board_id: $boardId, user_ids: $userIds, kind: ${kind}) { id name email }`,
		);
	}
	if (teamIds.length > 0) {
		varDefs.push('$teamIds: [ID!]!');
		variables.teamIds = teamIds;
		selections.push(
			removing
				? 'teams: delete_teams_from_board(board_id: $boardId, team_ids: $teamIds) { id name }'
				: `teams: add_teams_to_board(board_id: $boardId, team_ids: $teamIds, kind: ${kind}) { id name }`,
		);
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			${selections.join('\n')}
		}`,
		itemIndex,
		variables,
	);

	return {
		boardId,
		action: removing ? 'removed' : replacing ? 'replaced' : 'added',
		...(kind ? { kind } : {}),
		users: (data.users ?? []) as IDataObject[],
		teams: (data.teams ?? []) as IDataObject[],
		...(replacePlan
			? {
					removedUsers: (data.removedUsers ?? []) as IDataObject[],
					removedTeams: (data.removedTeams ?? []) as IDataObject[],
					keptExecutingUser: replacePlan.keptExecutingUser,
				}
			: {}),
	};
}

interface SubscriberEntity extends IDataObject {
	id?: string;
	name?: string;
	email?: string;
}

/**
 * Shapes the Board: List Subscribers output — one row per user/team, with
 * `type` (user/team) and `role` (subscriber/owner). A user who is both an
 * owner and a subscriber appears once per role.
 */
export function buildSubscriberRows(board: {
	subscribers?: SubscriberEntity[];
	owners?: SubscriberEntity[];
	team_subscribers?: SubscriberEntity[];
	team_owners?: SubscriberEntity[];
}): IDataObject[] {
	const rows: IDataObject[] = [];
	for (const user of board.owners ?? []) {
		rows.push({ type: 'user', role: 'owner', ...user });
	}
	for (const user of board.subscribers ?? []) {
		rows.push({ type: 'user', role: 'subscriber', ...user });
	}
	for (const team of board.team_owners ?? []) {
		rows.push({ type: 'team', role: 'owner', ...team });
	}
	for (const team of board.team_subscribers ?? []) {
		rows.push({ type: 'team', role: 'subscriber', ...team });
	}
	return rows;
}

/**
 * The user field set for board subscriber/owner rows. Users have no
 * pagination arguments on these connections — the API returns the full list.
 */
const SUBSCRIBER_USER_FIELDS = '{ id name email kind status title }';

/**
 * Team subscriber/owner connections ARE paginated (API default: first 25,
 * which silently truncated larger accounts before this was found). One page
 * of 1,000 is requested; the cap is documented on the toggles as a
 * limitation.
 */
export const TEAM_SUBSCRIBERS_LIMIT = 1000;
const SUBSCRIBER_TEAM_FIELDS = `(limit: ${TEAM_SUBSCRIBERS_LIMIT}, page: 1) { id name is_guest picture_url }`;

/**
 * Builds the boards(ids:) field selection for List Subscribers from the four
 * include toggles — only toggled-on connections are queried (each one adds
 * complexity cost).
 */
export function buildSubscribersSelection(include: {
	subscribers: boolean;
	owners: boolean;
	teamSubscribers: boolean;
	teamOwners: boolean;
}): string {
	const selections: string[] = [];
	if (include.subscribers) selections.push(`subscribers ${SUBSCRIBER_USER_FIELDS}`);
	if (include.owners) selections.push(`owners ${SUBSCRIBER_USER_FIELDS}`);
	if (include.teamSubscribers) selections.push(`team_subscribers${SUBSCRIBER_TEAM_FIELDS}`);
	if (include.teamOwners) selections.push(`team_owners${SUBSCRIBER_TEAM_FIELDS}`);
	return selections.join('\n\t\t\t\t');
}

/** Board: List Subscribers — users and teams, subscribers and owners. */
export async function getBoardSubscribers(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const include = {
		subscribers: this.getNodeParameter('includeSubscribers', itemIndex, true) as boolean,
		owners: this.getNodeParameter('includeOwners', itemIndex, true) as boolean,
		teamSubscribers: this.getNodeParameter('includeTeamSubscribers', itemIndex, true) as boolean,
		teamOwners: this.getNodeParameter('includeTeamOwners', itemIndex, true) as boolean,
	};
	const selection = buildSubscribersSelection(include);
	if (!selection) {
		throw new NodeOperationError(
			this.getNode(),
			'Turn on at least one of the Include toggles — with all four off there is nothing to return',
			{ itemIndex },
		);
	}
	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids) {
				${selection}
			}
		}`,
		itemIndex,
		{ ids: [boardId] },
	);
	const board = ((data.boards ?? []) as Array<Parameters<typeof buildSubscriberRows>[0]>)[0];
	if (!board) {
		throw new NodeOperationError(this.getNode(), `Board ${boardId} not found`, { itemIndex });
	}
	return buildSubscriberRows(board);
}

interface ActivityLogRow extends IDataObject {
	id?: string;
	event?: string;
	entity?: string;
	data?: string | null;
	user_id?: string;
	account_id?: string;
	created_at?: string;
}

/**
 * Shapes one activity log event: the `data` field arrives as a JSON string
 * (parsed here for the user), and `created_at` is a 17-digit UNIX timestamp
 * in ten-millionths of a second (converted to ISO in `createdAt`).
 */
export function formatActivityLogRow(row: ActivityLogRow): IDataObject {
	let parsedData: unknown = row.data ?? null;
	if (typeof row.data === 'string') {
		const parsed = safeJsonParse(row.data);
		if (parsed !== undefined) parsedData = parsed;
	}
	let createdAt: string | null = null;
	if (row.created_at) {
		const numeric = Number(row.created_at);
		if (!Number.isNaN(numeric) && numeric > 0) {
			createdAt = new Date(numeric / 10000).toISOString();
		}
	}
	return {
		id: row.id ?? null,
		event: row.event ?? null,
		entity: row.entity ?? null,
		userId: row.user_id ?? null,
		accountId: row.account_id ?? null,
		createdAt,
		createdAtRaw: row.created_at ?? null,
		data: parsedData as IDataObject,
	};
}

/**
 * Board: List Activity Logs — boards(ids:){ activity_logs(...) } with
 * date-range and entity filters, limit/page under Options.
 */
export async function getActivityLogs(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const filters = this.getNodeParameter('activityLogFilters', itemIndex, {}) as IDataObject;
	const options = this.getNodeParameter('activityLogOptions', itemIndex, {}) as IDataObject;
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const page = (options.page as number) ?? 1;

	const varDefs = ['$ids: [ID!]', '$limit: Int!', '$page: Int!'];
	const args = ['limit: $limit', 'page: $page'];
	const variables: Record<string, unknown> = { ids: [boardId], limit, page };

	if (filters.from) {
		varDefs.push('$from: ISO8601DateTime');
		args.push('from: $from');
		variables.from = toIso8601(filters.from);
	}
	if (filters.to) {
		varDefs.push('$to: ISO8601DateTime');
		args.push('to: $to');
		variables.to = toIso8601(filters.to);
	}
	const userIds = extractUserRowIds(filters.userIds);
	if (userIds.length > 0) {
		varDefs.push('$userIds: [ID!]');
		args.push('user_ids: $userIds');
		variables.userIds = userIds;
	}
	const columnIds = normalizeIdList(filters.columnIds);
	if (columnIds.length > 0) {
		varDefs.push('$columnIds: [String!]');
		args.push('column_ids: $columnIds');
		variables.columnIds = columnIds;
	}
	const groupIds = normalizeIdList(filters.groupIds);
	if (groupIds.length > 0) {
		varDefs.push('$groupIds: [String!]');
		args.push('group_ids: $groupIds');
		variables.groupIds = groupIds;
	}
	const itemIds = normalizeIdList(filters.itemIds);
	if (itemIds.length > 0) {
		varDefs.push('$itemIds: [ID!]');
		args.push('item_ids: $itemIds');
		variables.itemIds = itemIds;
	}

	const data = await client.execute(
		`query (${varDefs.join(', ')}) {
			boards(ids: $ids) {
				activity_logs(${args.join(', ')}) {
					id
					event
					entity
					data
					user_id
					account_id
					created_at
				}
			}
		}`,
		itemIndex,
		variables,
	);

	const logs =
		((data.boards ?? []) as Array<{ activity_logs?: ActivityLogRow[] }>)[0]?.activity_logs ?? [];
	return logs.map(formatActivityLogRow);
}

/**
 * Board: Create — create_board with optional workspace, template, owners
 * and subscribers. Only user-set arguments are sent, so API defaults
 * (main workspace, no template) stay in effect.
 */
export async function createBoard(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardName = this.getNodeParameter('boardName', itemIndex) as string;
	const boardKind = this.getNodeParameter('boardKind', itemIndex) as string;
	const options = this.getNodeParameter('createBoardOptions', itemIndex, {}) as IDataObject;

	const varDefs = ['$name: String!', '$kind: BoardKind!'];
	const args = ['board_name: $name', 'board_kind: $kind'];
	const variables: Record<string, unknown> = { name: boardName, kind: boardKind };

	if (options.description) {
		varDefs.push('$description: String');
		args.push('description: $description');
		variables.description = options.description;
	}
	// Resource locator nested in a collection: the read of the parent
	// collection hands back the raw { mode, value } object.
	const createBoardWorkspaceId = extractWorkspaceId(options.workspaceId);
	if (createBoardWorkspaceId) {
		varDefs.push('$workspaceId: ID');
		args.push('workspace_id: $workspaceId');
		variables.workspaceId = createBoardWorkspaceId;
	}
	if (options.folderId) {
		varDefs.push('$folderId: ID');
		args.push('folder_id: $folderId');
		variables.folderId = options.folderId;
	}
	if (options.templateId) {
		varDefs.push('$templateId: ID');
		args.push('template_id: $templateId');
		variables.templateId = options.templateId;
	}
	// Owners/Subscribers mix users and teams in one picker; the API wants
	// them split into separate arguments. Note the asymmetric argument name:
	// board_subscriber_teams_ids (teams_ids, not team_ids).
	const owners = splitUserTeamIds(extractUserRowIds(options.ownerIds));
	if (owners.userIds.length > 0) {
		varDefs.push('$ownerIds: [ID!]');
		args.push('board_owner_ids: $ownerIds');
		variables.ownerIds = owners.userIds;
	}
	if (owners.teamIds.length > 0) {
		varDefs.push('$ownerTeamIds: [ID!]');
		args.push('board_owner_team_ids: $ownerTeamIds');
		variables.ownerTeamIds = owners.teamIds;
	}
	const subscribers = splitUserTeamIds(extractUserRowIds(options.subscriberIds));
	if (subscribers.userIds.length > 0) {
		varDefs.push('$subscriberIds: [ID!]');
		args.push('board_subscriber_ids: $subscriberIds');
		variables.subscriberIds = subscribers.userIds;
	}
	if (subscribers.teamIds.length > 0) {
		varDefs.push('$subscriberTeamIds: [ID!]');
		args.push('board_subscriber_teams_ids: $subscriberTeamIds');
		variables.subscriberTeamIds = subscribers.teamIds;
	}

	const data = await client.execute(
		`mutation (${varDefs.join(', ')}) {
			create_board(${args.join(', ')}) {
				id
				name
				board_kind
				description
				url
				board_folder_id
				folder { id name }
				workspace { id name }
			}
		}`,
		itemIndex,
		variables,
	);

	return (data.create_board ?? {}) as IDataObject;
}

/**
 * Board: Get Many — direct limit/page mapping onto the boards query.
 * No "Return All": on huge accounts unbounded enumeration simply won't work;
 * callers walk pages explicitly instead.
 */
/**
 * Board: Get — one board by ID. Queries with state: all so archived and
 * deleted boards still resolve (the API defaults to active only, which made
 * archived boards look nonexistent). Output is the unwrapped board object.
 */
export async function getSingleBoard(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('getBoardOptions', itemIndex, {}) as IDataObject;

	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids, state: all) {
				${buildBoardFieldSelection({
					includeStructure: true,
					includeCompleteData: options.includeCompleteData === true,
				})}
			}
		}`,
		itemIndex,
		{ ids: [boardId] },
	);

	const boards = (data.boards ?? []) as IDataObject[];
	if (boards.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`Board ${boardId} was not found. It may never have existed, or your API token may not have access to it.`,
			{ itemIndex },
		);
	}
	return boards[0];
}

export async function getManyBoards(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	// Limit/Page live under Options (node-wide convention): the defaults are
	// used unless the user explicitly sets them.
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const page = (options.page as number) ?? 1;
	const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;

	// Only include filter args the user actually set, so we never override
	// the API's defaults (e.g. state defaults to active server-side).
	const varDefs = ['$limit: Int!', '$page: Int!'];
	const args = ['limit: $limit', 'page: $page'];
	const variables: Record<string, unknown> = {};

	if (filters.boardKind) {
		varDefs.push('$boardKind: BoardKind!');
		args.push('board_kind: $boardKind');
		variables.boardKind = filters.boardKind;
	}
	if (filters.state) {
		varDefs.push('$state: State!');
		args.push('state: $state');
		variables.state = filters.state;
	}
	if (filters.orderBy) {
		varDefs.push('$orderBy: BoardsOrderBy!');
		args.push('order_by: $orderBy');
		variables.orderBy = filters.orderBy;
	}
	// Both ID filters come from a multiOptions dropdown (array) or an
	// expression (array or comma-separated string).
	const workspaceIds = normalizeIdList(filters.workspaceIds);
	if (workspaceIds.length > 0) {
		varDefs.push('$workspaceIds: [ID!]');
		args.push('workspace_ids: $workspaceIds');
		variables.workspaceIds = workspaceIds;
	}
	const boardIds = normalizeIdList(filters.boardIds);
	if (boardIds.length > 0) {
		varDefs.push('$boardIds: [ID!]');
		args.push('ids: $boardIds');
		variables.boardIds = boardIds;
	}

	const data = await client.execute(
		`query (${varDefs.join(', ')}) {
			boards(${args.join(', ')}) {
				${buildBoardFieldSelection({ includeCompleteData: options.includeCompleteData === true })}
			}
		}`,
		itemIndex,
		{ ...variables, limit, page },
	);

	// The boards query also returns monday docs and subitem boards; a
	// "Get Many Boards" caller wants boards. Because this filter runs after
	// the API page, a page can return fewer than `limit` rows on accounts
	// with many docs — page numbering itself is unaffected.
	return ((data.boards ?? []) as IDataObject[]).filter((board) =>
		isRealBoard(board as { type?: string }),
	);
}

/**
 * Board: Aggregate Item Data — one server-side aggregate() call. Only the
 * result rows come back; the board's items are never fetched. One bounded
 * columns read resolves filter labels, column titles for output keys, and
 * the type-aware conversions (status/dropdown → label text, dates → ISO).
 */
export async function aggregateBoardData(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const calculationRows =
		(
			this.getNodeParameter('aggregateCalculations', itemIndex, {}) as {
				calculations?: Array<{
					function: string;
					numericColumnId?: string;
					minMaxColumnId?: string;
					anyColumnId?: string;
					outputName?: string;
				}>;
			}
		).calculations ?? [];
	const groupByRows =
		(
			this.getNodeParameter('aggregateGroupBy', itemIndex, {}) as {
				groups?: Array<{ columnId: string; dateGrouping?: string }>;
			}
		).groups ?? [];
	const filterRows =
		(this.getNodeParameter('aggregateFilters', itemIndex, {}) as { rules?: FilterRuleInput[] })
			.rules ?? [];
	const options = this.getNodeParameter('aggregateOptions', itemIndex, {}) as IDataObject;

	// Each function shows its own type-filtered column picker in the UI, so
	// the picked column arrives under one of three names.
	const calculations: AggregateCalculationRow[] = calculationRows.map((row) => ({
		function: row.function,
		columnId: row.numericColumnId || row.minMaxColumnId || row.anyColumnId || undefined,
		outputName: row.outputName,
	}));

	const needsColumns =
		groupByRows.length > 0 ||
		filterRows.length > 0 ||
		calculations.some((row) => row.columnId !== undefined);
	const columns = needsColumns ? await fetchColumns(this, boardId, itemIndex) : [];

	// Same operator-vs-column-type guard as Item: Get Many (stale dropdown
	// selections and expression-mode column IDs bypass the dynamic dropdown).
	const unsupportedOperatorRules = findUnsupportedOperatorRules(filterRows, columns);
	if (unsupportedOperatorRules.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			formatUnsupportedOperatorMessage(unsupportedOperatorRules),
			{ itemIndex },
		);
	}

	let plan: AggregateQueryPlan;
	try {
		plan = buildAggregateQueryPlan({
			boardId,
			calculations,
			groupBys: groupByRows,
			columns,
			filterRules: filterRows.length > 0 ? buildFilterRules(filterRows, columns) : undefined,
			filtersMatch: (options.filtersMatch as string) ?? 'and',
			limit: (options.limit as number) ?? DEFAULT_LIMIT,
		});
	} catch (error) {
		if (error instanceof AggregateInputError) {
			throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
		}
		// Anything else is a programming error, not an API/input problem.
		throw error;
	}

	const data = await client.execute(
		`query ($query: AggregateQueryInput!) {
			aggregate(query: $query) {
				results {
					entries {
						alias
						value {
							... on AggregateBasicAggregationResult { result }
							... on AggregateGroupByResult { value }
						}
					}
				}
			}
		}`,
		itemIndex,
		{ query: plan.queryInput },
	);

	const rows = parseAggregateResults(data as AggregateApiResponse, plan.aliases);

	// On multi-level boards the aggregation engine scans LEAF items only
	// (verified live; no API control exists) — flag it so users don't read
	// the numbers as covering parent items too. One bounded lookup, cached
	// per execution.
	const hierarchyType = await getBoardHierarchyType(client, itemIndex, boardId);
	if (hierarchyType === 'multi_level') {
		return rows.map((row) => ({ ...row, multiLevelBoardNote: MULTI_LEVEL_AGGREGATE_NOTE }));
	}
	return rows;
}
