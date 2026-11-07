import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import type { SubscriberEntity } from '../../helpers/boardSubscribers';
import { normalizeIdList } from '../../helpers/filterOptions';
import { buildUserRowsProperty, extractUserRowIds } from '../../helpers/userLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		// Add vs Remove used to be two operations; merged into one with
		// a mode selector (product decision 2026-07-19, no back compat).
		displayName: 'Action',
		name: 'subscribersAction',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add the users/teams to the board as subscribers or owners',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove the users/teams from the board',
			},
		],
		default: 'add',
		description: 'Whether to add the selected users/teams to the board or remove them',
	},
	buildUserRowsProperty({
		displayName: 'Users',
		name: 'subscriberUserIds',
		description:
			'The users to add or remove. In expression mode, pass user IDs as a comma-separated string.',
	}),
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Teams',
		name: 'subscriberTeamIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getTeamsList' },
		default: [],
		description:
			'The teams to add or remove. In expression mode, pass team IDs as a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Add As',
		name: 'subscriberKind',
		type: 'options',
		options: [
			{ name: 'Owner', value: 'owner' },
			{ name: 'Subscriber', value: 'subscriber' },
		],
		default: 'subscriber',
		description: 'Whether the users/teams become plain subscribers or board owners',
		displayOptions: {
			show: { subscribersAction: ['add'] },
		},
	},
	{
		// Advanced options, not an Update Fields collection — the lint rule
		// misfires on any collection shown for an operation named update*.
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-update-fields
		displayName: 'Options',
		name: 'updateSubscribersOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: { subscribersAction: ['add'] },
		},
		options: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Add the selected users/teams on top of the current subscribers',
					},
					{
						name: 'Replace',
						value: 'replace',
						description:
							'Make the selected users/teams the only subscribers: current ones not in the selection are removed (the user running the workflow is never removed)',
					},
				],
				default: 'append',
				description: 'How the selection is applied to the board’s current subscribers',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['updateBoardSubscribers'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

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

/** The BoardSubscriberKind enum values; the field accepts expressions, so validate. */
const BOARD_SUBSCRIBER_KINDS = new Set(['owner', 'subscriber']);

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
export async function execute(
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
	if (kind !== undefined && !BOARD_SUBSCRIBER_KINDS.has(kind)) {
		throw new NodeOperationError(
			this.getNode(),
			`Subscriber Kind must be "owner" or "subscriber", got "${kind}"`,
			{ itemIndex },
		);
	}
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
	if (kind !== undefined) {
		varDefs.push('$kind: BoardSubscriberKind');
		variables.kind = kind;
	}

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
				: 'users: add_users_to_board(board_id: $boardId, user_ids: $userIds, kind: $kind) { id name email }',
		);
	}
	if (teamIds.length > 0) {
		varDefs.push('$teamIds: [ID!]!');
		variables.teamIds = teamIds;
		selections.push(
			removing
				? 'teams: delete_teams_from_board(board_id: $boardId, team_ids: $teamIds) { id name }'
				: 'teams: add_teams_to_board(board_id: $boardId, team_ids: $teamIds, kind: $kind) { id name }',
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
