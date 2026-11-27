import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { buildBoardFieldSelection } from '../../helpers/boardFields';
import { isRealBoard } from '../../helpers/boardLocator';
import { normalizeIdList } from '../../helpers/filterOptions';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { INCLUDE_COMPLETE_BOARD_DATA_OPTION } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Board Kind',
				name: 'boardKind',
				type: 'options',
				options: [
					{ name: 'Private', value: 'private' },
					{ name: 'Public', value: 'public' },
					{ name: 'Shareable', value: 'share' },
				],
				default: 'public',
				description: 'Only return boards of this kind',
			},
			{
				displayName: 'Board Names or IDs',
				name: 'boardIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getBoardList' },
				default: [],
				description:
					'Only return these boards. The list shows only the 500 most recently used boards (searchable by name, but only within that window); for boards beyond it, pass explicit IDs via an expression (an array or a comma-separated string). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Last Used', value: 'used_at' },
				],
				default: 'used_at',
				description: 'Property to order the results by',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Deleted', value: 'deleted' },
				],
				default: 'active',
				description: 'Only return boards in this state',
			},
			{
				displayName: 'Workspace Names or IDs',
				name: 'workspaceIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getWorkspaces' },
				default: [],
				description:
					'Only return boards in these workspaces — searchable by name. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			INCLUDE_COMPLETE_BOARD_DATA_OPTION,
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'Higher limits consume more of your account’s API complexity budget per run',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description:
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through large accounts.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['getBoards'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Board: Get Many — direct limit/page mapping onto the boards query.
 * No "Return All": on huge accounts unbounded enumeration simply won't work;
 * callers walk pages explicitly instead.
 */
export async function execute(
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
