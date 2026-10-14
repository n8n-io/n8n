import { describe, expect, it } from 'vitest';

import {
	AggregateInputError,
	buildAggregateQueryPlan,
	parseAggregateResults,
	toOutputKey,
	type AggregateApiResponse,
} from '../helpers/aggregate';

const COLUMNS = [
	{ id: 'status_1', title: 'Stage', type: 'status' },
	{ id: 'drop_1', title: 'Tags!', type: 'dropdown' },
	{ id: 'num_1', title: 'Deal Amount', type: 'numbers' },
	{ id: 'date_1', title: 'Due Date', type: 'date' },
	{ id: 'text_1', title: 'Notes', type: 'text' },
];

describe('toOutputKey', () => {
	it('snake_cases titles and strips punctuation', () => {
		expect(toOutputKey('Deal Amount')).toBe('deal_amount');
		expect(toOutputKey('Tags!')).toBe('tags');
		expect(toOutputKey('  e2e Due ')).toBe('e2e_due');
	});

	it('falls back when nothing survives', () => {
		expect(toOutputKey('!!!')).toBe('column');
	});
});

describe('buildAggregateQueryPlan', () => {
	it('builds a whole-board count with no group_by or filters', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [],
			columns: COLUMNS,
		});
		expect(plan.queryInput).toEqual({
			from: { type: 'TABLE', id: '123' },
			select: [{ type: 'FUNCTION', function: { function: 'COUNT_ITEMS' }, as: 'c0' }],
		});
		expect(plan.aliases).toEqual([
			{ alias: 'c0', outputKey: 'count_items', kind: 'calculation', isDate: false },
		]);
	});

	it('wraps status and dropdown group-bys in LABEL and points group_by at the alias', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [{ columnId: 'status_1' }, { columnId: 'drop_1' }],
			columns: COLUMNS,
		});
		expect(plan.queryInput.select).toEqual([
			{
				type: 'FUNCTION',
				function: {
					function: 'LABEL',
					params: [{ type: 'COLUMN', column: { column_id: 'status_1' }, as: 'g0_src' }],
				},
				as: 'g0',
			},
			{
				type: 'FUNCTION',
				function: {
					function: 'LABEL',
					params: [{ type: 'COLUMN', column: { column_id: 'drop_1' }, as: 'g1_src' }],
				},
				as: 'g1',
			},
			{ type: 'FUNCTION', function: { function: 'COUNT_ITEMS' }, as: 'c0' },
		]);
		expect(plan.queryInput.group_by).toEqual([{ column_id: 'g0' }, { column_id: 'g1' }]);
		expect(plan.aliases.map((a) => a.outputKey)).toEqual(['stage', 'tags', 'count_items']);
	});

	it('buckets date group-bys with DATE_TRUNC_* and leaves exact dates as a plain column', () => {
		const bucketed = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [{ columnId: 'date_1', dateGrouping: 'month' }],
			columns: COLUMNS,
		});
		expect(bucketed.queryInput.select).toContainEqual({
			type: 'FUNCTION',
			function: {
				function: 'DATE_TRUNC_MONTH',
				params: [{ type: 'COLUMN', column: { column_id: 'date_1' }, as: 'g0_src' }],
			},
			as: 'g0',
		});

		const exact = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [{ columnId: 'date_1', dateGrouping: 'none' }],
			columns: COLUMNS,
		});
		expect(exact.queryInput.select).toContainEqual({
			type: 'COLUMN',
			column: { column_id: 'date_1' },
			as: 'g0',
		});
		expect(exact.aliases[0]).toMatchObject({ isDate: true, isLabel: false });
	});

	it('ignores the date bucket on non-date columns', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [{ columnId: 'text_1', dateGrouping: 'month' }],
			columns: COLUMNS,
		});
		expect(plan.queryInput.select).toContainEqual({
			type: 'COLUMN',
			column: { column_id: 'text_1' },
			as: 'g0',
		});
	});

	it('supports the synthetic board group column', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [{ columnId: 'group' }],
			columns: COLUMNS,
		});
		expect(plan.queryInput.select).toContainEqual({
			type: 'COLUMN',
			column: { column_id: 'group' },
			as: 'g0',
		});
		expect(plan.aliases[0].outputKey).toBe('board_group');
	});

	it('maps every calculation function and derives output keys from column titles', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [
				{ function: 'sum', columnId: 'num_1' },
				{ function: 'average', columnId: 'num_1' },
				{ function: 'median', columnId: 'num_1' },
				{ function: 'min', columnId: 'date_1' },
				{ function: 'max', columnId: 'num_1' },
				{ function: 'countValues', columnId: 'text_1' },
				{ function: 'countUnique', columnId: 'status_1' },
			],
			groupBys: [],
			columns: COLUMNS,
		});
		expect(
			(plan.queryInput.select as Array<{ function: { function: string } }>).map(
				(element) => element.function.function,
			),
		).toEqual(['SUM', 'AVERAGE', 'MEDIAN', 'MIN', 'MAX', 'COUNT', 'COUNT_DISTINCT']);
		expect(plan.aliases.map((a) => a.outputKey)).toEqual([
			'sum_deal_amount',
			'average_deal_amount',
			'median_deal_amount',
			'min_due_date',
			'max_deal_amount',
			'count_notes',
			'count_unique_stage',
		]);
		// MIN on a date column needs epoch → ISO conversion; MAX on numbers doesn't.
		expect(plan.aliases[3].isDate).toBe(true);
		expect(plan.aliases[4].isDate).toBe(false);
	});

	it('prefers the user-set output name and dedupes collisions', () => {
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [
				{ function: 'sum', columnId: 'num_1', outputName: 'total' },
				{ function: 'sum', columnId: 'num_1', outputName: 'total' },
			],
			groupBys: [],
			columns: COLUMNS,
		});
		expect(plan.aliases.map((a) => a.outputKey)).toEqual(['total', 'total_2']);
	});

	it('passes filters and limit through', () => {
		const rules = [{ column_id: 'status_1', compare_value: [1], operator: 'any_of' }];
		const plan = buildAggregateQueryPlan({
			boardId: '123',
			calculations: [{ function: 'countItems' }],
			groupBys: [],
			columns: COLUMNS,
			filterRules: rules,
			filtersMatch: 'or',
			limit: 100,
		});
		expect(plan.queryInput.query).toEqual({ rules, operator: 'or' });
		expect(plan.queryInput.limit).toBe(100);
	});

	it('throws friendly errors on missing calculations or columns', () => {
		expect(() =>
			buildAggregateQueryPlan({
				boardId: '123',
				calculations: [],
				groupBys: [],
				columns: COLUMNS,
			}),
		).toThrow(AggregateInputError);

		expect(() =>
			buildAggregateQueryPlan({
				boardId: '123',
				calculations: [{ function: 'sum' }],
				groupBys: [],
				columns: COLUMNS,
			}),
		).toThrow(/needs a column/);
	});
});

describe('parseAggregateResults', () => {
	const plan = buildAggregateQueryPlan({
		boardId: '123',
		calculations: [
			{ function: 'countItems' },
			{ function: 'sum', columnId: 'num_1' },
			{ function: 'max', columnId: 'date_1' },
		],
		groupBys: [{ columnId: 'status_1' }, { columnId: 'date_1', dateGrouping: 'month' }],
		columns: COLUMNS,
	});

	it('flattens entries into friendly keyed rows with converted values', () => {
		const response: AggregateApiResponse = {
			aggregate: {
				results: [
					{
						entries: [
							{ alias: 'c0', value: { result: 2 } },
							{ alias: 'c1', value: { result: 15 } },
							// MAX over a date column: epoch ms → ISO date.
							{ alias: 'c2', value: { result: 1784678400000 } },
							{ alias: 'g0', value: { value: 'Done' } },
							// DATE_TRUNC_MONTH: epoch ms of the period start.
							{ alias: 'g1', value: { value: 1782864000000 } },
						],
					},
					{
						entries: [
							{ alias: 'c0', value: { result: 5 } },
							// SUM over no numeric values: the union flips to { value: null }.
							{ alias: 'c1', value: { value: null } },
							{ alias: 'c2', value: { value: null } },
							// "" = items with no label set.
							{ alias: 'g0', value: { value: '' } },
							{ alias: 'g1', value: { value: null } },
						],
					},
				],
			},
		};

		expect(parseAggregateResults(response, plan.aliases)).toEqual([
			{
				stage: 'Done',
				due_date: '2026-07-01',
				count_items: 2,
				sum_deal_amount: 15,
				max_due_date: '2026-07-22',
			},
			{
				stage: null,
				due_date: null,
				count_items: 5,
				sum_deal_amount: null,
				max_due_date: null,
			},
		]);
	});

	it('returns an empty array when the API returns no results', () => {
		expect(parseAggregateResults({ aggregate: { results: [] } }, plan.aliases)).toEqual([]);
		expect(parseAggregateResults({}, plan.aliases)).toEqual([]);
	});
});
