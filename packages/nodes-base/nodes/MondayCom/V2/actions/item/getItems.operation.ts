import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardNotFoundError, boardResourceLocator } from '../../helpers/boardLocator';
import { fetchColumns } from '../../helpers/columnMapper';
import { normalizeIdList } from '../../helpers/filterOptions';
import {
	buildFilterRules,
	type FilterRuleInput,
	findRollupStatusRuleColumns,
	findUnsupportedOperatorRules,
	formatUnsupportedOperatorMessage,
} from '../../helpers/itemFilters';
import {
	BATTERY_VALUE_FRAGMENT,
	buildAllGroupsRule,
	COLUMN_VALUES_CALCULATED_ARG,
	fetchBoardGroupIds,
	LINKED_VALUE_FRAGMENTS,
} from '../../helpers/multiLevel';
import { fetchAllByCursor } from '../../helpers/pagination';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Filters',
		name: 'itemFilters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Filter',
		default: {},
		description:
			'Server-side column-value filters (items_page query params) — far cheaper than fetching everything and filtering in n8n',
		options: [
			{
				displayName: 'Filter',
				name: 'rules',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'columnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFilterableBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column to filter on. Status columns that roll up child values (multi-level boards) are not filterable — the API returns unreliable results for them. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Operator Name or ID',
						name: 'operator',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFilterOperators',
							loadOptionsDependsOn: ['boardId.value', '&columnId'],
						},
						default: 'any_of',
						description:
							'How to compare — only the operators the selected column type supports are listed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							'The value to compare against. Comma-separated list for Any Of / Not Any Of / Between / Contains Terms. Status and dropdown labels can be given by name (e.g. "Done") — they are resolved to label indexes automatically.',
						displayOptions: { hide: { operator: ['is_empty', 'is_not_empty'] } },
					},
				],
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
			{
				// "Include Columns" per product wording; the standard "Names or IDs" suffix reads worse here.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Include Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these columns; selecting none includes all columns. The item name is always included. On large boards limiting columns keeps payload and API complexity down. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Cursor',
				name: 'includeCursor',
				type: 'boolean',
				default: false,
				description:
					'Whether to append one final output item { nextCursor } after the items. Feed it into Starting Cursor (in this node or another one) to fetch the next page; null means no more items.',
			},
			{
				// "Include Groups" per product wording, matching Include Columns.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Include Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return items from these groups; selecting none includes the whole board. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Subitems (Multi-Level Boards)',
				name: 'includeSubitems',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the board's subitems too (multi-level boards) as a flat list — every row gains a parent_item, null on top-level items. Filters then match subitems as well. Has no effect on classic boards, and cannot be combined with Sort By Column (the API ignores sorting in this mode).",
			},
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
				displayName: 'Match',
				name: 'filtersMatch',
				type: 'options',
				options: [
					{ name: 'All Filters (AND)', value: 'and' },
					{ name: 'Any Filter (OR)', value: 'or' },
				],
				default: 'and',
				description:
					'How multiple filters combine. Applies to every rule, including the group filter.',
			},
			{
				// The column ID string IS the sort key; "Name or ID" suffix would mislead.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Sort By Column',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: '',
				description:
					'Sort results server-side by this column. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'Used together with Sort By Column',
			},
			{
				displayName: 'Starting Cursor',
				name: 'startingCursor',
				type: 'string',
				default: '',
				description:
					'Continue fetching from a cursor returned by a previous run (valid for 60 minutes). When set, filters, groups, and sorting are ignored — the cursor already encodes the query.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['getItems'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Item: Get Many — cursor pagination via items_page / next_items_page.
 * Group and column-value filtering plus sorting all go through query_params,
 * which keeps a single cursor across the whole query. Emits one item per
 * record, plus an optional trailing { nextCursor } item for resuming.
 *
 * Include Subitems (multi-level boards) adds hierarchy_scope_config:
 * "allItems" — subject to two verified API bugs handled here: order_by is
 * silently ignored under that scope (blocked with an error), and an
 * unfiltered all-items query returns an empty page (worked around with a
 * tautological all-groups rule).
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	// No "Return All" — a bounded limit only, under Options with a default
	// (node-wide convention). The helper still walks the cursor internally
	// (100/request) until the limit is reached.
	const limit = (options.limit as number) ?? DEFAULT_LIMIT;
	const groupIds = normalizeIdList(options.groupIds);
	const columnIds = normalizeIdList(options.columnIds);
	const startingCursor = (options.startingCursor ?? '') as string;
	const includeCursor = options.includeCursor === true;
	const includeSubitems = options.includeSubitems === true;

	if (includeSubitems && options.sortBy && !startingCursor) {
		throw new NodeOperationError(
			this.getNode(),
			'Sort By Column cannot be combined with Include Subitems — the API silently ignores sorting when subitems are included. Remove one of the two options.',
			{ itemIndex },
		);
	}

	const filterRows =
		(this.getNodeParameter('itemFilters', itemIndex, {}) as { rules?: FilterRuleInput[] }).rules ??
		[];

	const rules: IDataObject[] = [];
	if (groupIds.length > 0) {
		rules.push({ column_id: 'group', compare_value: groupIds, operator: 'any_of' });
	}
	if (filterRows.length > 0) {
		// Column settings are needed to resolve status/dropdown label text
		// into the label indexes the API filters by.
		const columns = await fetchColumns(this, boardId, itemIndex);
		// Rollup status columns (BatteryValue) return silently wrong filter
		// results — the picker hides them, this guards expression-set IDs.
		const rollupStatusColumns = findRollupStatusRuleColumns(filterRows, columns);
		if (rollupStatusColumns.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Cannot filter on ${rollupStatusColumns.join(', ')}: status columns that roll up child values (multi-level boards) return unreliable filter results in the monday API. Filter on a different column, or filter the output in n8n instead.`,
				{ itemIndex },
			);
		}
		// Stale dropdown selections (n8n keeps the operator when the column
		// changes) and expression-mode column IDs can pair a column with an
		// operator its type rejects — fail with the supported list up front.
		const unsupportedOperatorRules = findUnsupportedOperatorRules(filterRows, columns);
		if (unsupportedOperatorRules.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				formatUnsupportedOperatorMessage(unsupportedOperatorRules),
				{ itemIndex },
			);
		}
		rules.push(...buildFilterRules(filterRows, columns));
	}
	if (includeSubitems && rules.length === 0 && !startingCursor) {
		// Verified API bug: the all-items scope returns an empty page when no
		// rules are set at all. A rule matching every group is a no-op filter.
		rules.push(buildAllGroupsRule(await fetchBoardGroupIds(client, itemIndex, boardId)));
	}

	const orderBy = options.sortBy
		? [{ column_id: options.sortBy, direction: options.sortDirection ?? 'asc' }]
		: undefined;

	let queryParams: IDataObject | null = null;
	if (rules.length > 0 || orderBy) {
		queryParams = {};
		if (rules.length > 0) {
			queryParams.rules = rules;
			queryParams.operator = options.filtersMatch ?? 'and';
		}
		if (orderBy) {
			queryParams.order_by = orderBy;
		}
	}

	// Column IDs come from the picker or an expression; serialize them as a
	// JSON string array, which is valid GraphQL list syntax for [String!].
	// Empty selection = all columns. The item name is a top-level field, so
	// it is always present regardless of this selection. CALCULATED is
	// always requested — without it, rollup columns (multi-level boards)
	// are silently missing from column_values.
	const columnArgs =
		columnIds.length > 0
			? `(ids: ${JSON.stringify(columnIds)}, ${COLUMN_VALUES_CALCULATED_ARG})`
			: `(${COLUMN_VALUES_CALCULATED_ARG})`;
	const itemFields = `
		id
		name
		state
		url
		created_at
		updated_at
		group { id title }
		${includeSubitems ? 'parent_item { id name }' : ''}
		column_values${columnArgs} { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
	`;

	interface ItemsPagePayload {
		boards?: Array<{ items_page?: { cursor: string | null; items: IDataObject[] } }>;
	}

	// The hierarchy scope only exists on the first query; follow-up
	// next_items_page calls inherit it through the cursor.
	const scopeArg = includeSubitems ? ', hierarchy_scope_config: "allItems"' : '';

	const { rows, nextCursor } = await fetchAllByCursor({
		client,
		itemIndex,
		firstQuery: `query ($boardId: [ID!], $limit: Int!, $queryParams: ItemsQuery) {
			boards(ids: $boardId) {
				items_page(limit: $limit, query_params: $queryParams${scopeArg}) {
					cursor
					items { ${itemFields} }
				}
			}
		}`,
		firstVariables: {
			boardId: [boardId],
			queryParams,
		},
		extractFirstPage: (data) => {
			const board = (data as ItemsPagePayload).boards?.[0];
			if (!board) throw boardNotFoundError(this.getNode(), boardId, itemIndex);
			const page = board.items_page;
			return page ? { cursor: page.cursor, items: page.items } : undefined;
		},
		itemFields,
		limit,
		startCursor: startingCursor || undefined,
	});

	return includeCursor ? [...rows, { nextCursor }] : rows;
}
