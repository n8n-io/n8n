import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { normalizeIdList, toIso8601 } from '../../helpers/filterOptions';
import { safeJsonParse } from '../../helpers/json';
import { buildUserRowsProperty, extractUserRowIds } from '../../helpers/userLocator';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Filters',
		name: 'activityLogFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				// "Columns" per product wording, matching Include Columns.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return events on these columns. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only return events from this time onward',
			},
			{
				// "Groups" per product wording, matching Include Groups.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return events in these groups. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Item IDs',
				name: 'itemIds',
				type: 'string',
				default: '',
				description: 'Only return events on these items (comma-separated IDs)',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only return events up to this time',
			},
			buildUserRowsProperty({
				displayName: 'Users',
				name: 'userIds',
				description:
					'Only return events by these users. Expressions accept an array or a comma-separated string of user IDs.',
			}),
		],
	},
	{
		displayName: 'Options',
		name: 'activityLogOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
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
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through long histories.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['getActivityLogs'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

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
export async function execute(
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
