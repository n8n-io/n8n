import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared Group selector, dependent on the board selected in the `boardId`
 * parameter. Groups are a small, bounded collection (a board rarely has more
 * than a few dozen), so the list mode loads them all in one request and
 * filters client-side — no pagination needed.
 */
export const groupResourceLocator: INodeProperties = {
	displayName: 'Group',
	name: 'groupId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description: 'The group to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchGroups',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. topics',
		},
	],
};

interface GroupRow {
	id: string;
	title: string;
	position?: string;
}

/**
 * listSearch method for the group From List mode. Reads the board from the
 * node's `boardId` parameter, so the list reloads when the board changes.
 */
export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	boardParameter = 'boardId',
): Promise<INodeListSearchResult> {
	const boardId = this.getCurrentNodeParameter(boardParameter, { extractValue: true }) as string;
	if (!boardId) {
		return { results: [] };
	}

	const client = new MondayGraphQLClient(this);
	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids) {
				groups { id title position }
			}
		}`,
		0,
		{ ids: [boardId] },
	);

	const boards = (data.boards ?? []) as Array<{ groups?: GroupRow[] }>;
	const groups = boards[0]?.groups ?? [];
	const needle = filter?.toLowerCase();

	return {
		results: groups
			.filter((group) => !needle || group.title.toLowerCase().includes(needle))
			.map((group) => ({ name: group.title, value: group.id })),
	};
}

/**
 * loadOptions method for group multi-selects (e.g. the Get Many Items group
 * filter), dependent on the node's `boardId` parameter like searchGroups.
 */
export async function getBoardGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { results } = await searchGroups.call(this);
	return results.map((group) => ({ name: group.name, value: String(group.value) }));
}

/**
 * Same as getBoardGroups but reads the `targetBoardId` parameter — for
 * cross-board moves where source and destination boards differ.
 */
export async function getTargetBoardGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { results } = await searchGroups.call(this, undefined, 'targetBoardId');
	return results.map((group) => ({ name: group.name, value: String(group.value) }));
}
