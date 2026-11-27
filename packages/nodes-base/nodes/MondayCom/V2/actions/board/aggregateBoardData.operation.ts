import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	AGGREGATE_DATE_GROUPING_OPTIONS,
	AGGREGATE_FUNCTION_OPTIONS,
	type AggregateApiResponse,
	type AggregateCalculationRow,
	AggregateInputError,
	type AggregateQueryPlan,
	buildAggregateQueryPlan,
	parseAggregateResults,
} from '../../helpers/aggregate';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { fetchColumns } from '../../helpers/columnMapper';
import {
	buildFilterRules,
	type FilterRuleInput,
	findUnsupportedOperatorRules,
	formatUnsupportedOperatorMessage,
} from '../../helpers/itemFilters';
import { getBoardHierarchyType, MULTI_LEVEL_AGGREGATE_NOTE } from '../../helpers/multiLevel';
import { DEFAULT_LIMIT } from '../../transport/constants';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Calculations',
		name: 'aggregateCalculations',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Calculation',
		default: { calculations: [{ function: 'countItems' }] },
		description: 'What to calculate across the board’s items',
		options: [
			{
				displayName: 'Calculation',
				name: 'calculations',
				values: [
					{
						// "Calculation" (not "Function") keeps this first under the
						// lint's alphabetical ordering — where it belongs in the UI.
						displayName: 'Calculation',
						name: 'function',
						type: 'options',
						options: AGGREGATE_FUNCTION_OPTIONS,
						default: 'countItems',
						description: 'The calculation to run',
					},
					{
						displayName: 'Column Name or ID',
						name: 'numericColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateNumericColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The numbers or rating column to calculate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['sum', 'average', 'median'] } },
					},
					{
						displayName: 'Column Name or ID',
						name: 'minMaxColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateMinMaxColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The numbers, rating, or date column to calculate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['min', 'max'] } },
					},
					{
						displayName: 'Column Name or ID',
						name: 'anyColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column whose values to count. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['countValues', 'countUnique'] } },
					},
					{
						displayName: 'Output Field Name',
						name: 'outputName',
						type: 'string',
						default: '',
						description:
							'What to call this calculation in the output. Left empty, a name like "sum_budget" is generated from the function and column.',
					},
				],
			},
		],
	},
	{
		displayName: 'Group By',
		name: 'aggregateGroupBy',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Grouping',
		default: {},
		description:
			'Split the results into one row per value of these columns, like the rows of a pivot table. Without a grouping you get a single totals row for the whole board.',
		options: [
			{
				displayName: 'Grouping',
				name: 'groups',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'columnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateGroupByColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column to group by — status and dropdown values come back as label text, and "Board Group" groups by the board\'s groups. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Date Grouping',
						name: 'dateGrouping',
						type: 'options',
						options: AGGREGATE_DATE_GROUPING_OPTIONS,
						default: 'none',
						description:
							'For date columns only: bucket the dates by day, week, month, quarter, or year — the output shows the first day of each bucket. Ignored for other column types.',
					},
				],
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'aggregateFilters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Filter',
		default: {},
		description:
			'Only aggregate the items that match these column-value filters (applied server-side)',
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
							'The column to filter on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		name: 'aggregateOptions',
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
				hint: 'One result row per group combination — raise this when grouping by a column with many distinct values',
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
				description: 'How multiple filters combine',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['aggregateBoardData'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Board: Aggregate Item Data — one server-side aggregate() call. Only the
 * result rows come back; the board's items are never fetched. One bounded
 * columns read resolves filter labels, column titles for output keys, and
 * the type-aware conversions (status/dropdown → label text, dates → ISO).
 */
export async function execute(
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
