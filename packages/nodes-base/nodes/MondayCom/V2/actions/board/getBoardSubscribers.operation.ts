import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import type { SubscriberEntity } from '../../helpers/boardSubscribers';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Include User Subscribers',
		name: 'includeSubscribers',
		type: 'boolean',
		default: true,
		description: 'Whether to return the users subscribed to the board',
	},
	{
		displayName: 'Include User Owners',
		name: 'includeOwners',
		type: 'boolean',
		default: true,
		description: 'Whether to return the users who own the board',
	},
	{
		displayName: 'Include Team Subscribers',
		name: 'includeTeamSubscribers',
		type: 'boolean',
		default: true,
		description:
			'Whether to return the teams subscribed to the board. Limitation: only the first 1,000 team subscribers are returned.',
	},
	{
		displayName: 'Include Team Owners',
		name: 'includeTeamOwners',
		type: 'boolean',
		default: true,
		description:
			'Whether to return the teams that own the board. Limitation: only the first 1,000 team owners are returned.',
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['getBoardSubscribers'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

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
export async function execute(
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
