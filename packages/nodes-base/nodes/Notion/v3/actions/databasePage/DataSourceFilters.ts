import { capitalCase } from 'change-case';
import moment from 'moment-timezone';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { splitPropertyKey } from '../../helpers/utils';

type FilterCondition = IDataObject & {
	key?: string;
	type?: string;
	condition?: string;
	returnType?: string;
};

const EMPTY_CONDITIONS = ['is_empty', 'is_not_empty'];
const RELATIVE_DATE_CONDITIONS = [
	'next_month',
	'next_week',
	'next_year',
	'past_month',
	'past_week',
	'past_year',
	'this_week',
];

const CONDITION_OPTIONS: Record<string, string[]> = {
	checkbox: ['equals', 'does_not_equal'],
	date: [
		'equals',
		'before',
		'after',
		'on_or_before',
		'on_or_after',
		'is_empty',
		'is_not_empty',
		'next_month',
		'next_week',
		'next_year',
		'past_month',
		'past_week',
		'past_year',
		'this_week',
	],
	files: ['is_empty', 'is_not_empty'],
	multi_select: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
	number: [
		'equals',
		'does_not_equal',
		'greater_than',
		'less_than',
		'greater_than_or_equal_to',
		'less_than_or_equal_to',
		'is_empty',
		'is_not_empty',
	],
	people: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
	phone_number: [
		'equals',
		'does_not_equal',
		'contains',
		'does_not_contain',
		'starts_with',
		'ends_with',
		'is_empty',
		'is_not_empty',
	],
	relation: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
	rich_text: [
		'equals',
		'does_not_equal',
		'contains',
		'does_not_contain',
		'starts_with',
		'ends_with',
		'is_empty',
		'is_not_empty',
	],
	select: ['equals', 'does_not_equal', 'is_empty', 'is_not_empty'],
	status: ['equals', 'does_not_equal', 'is_empty', 'is_not_empty'],
	unique_id: [
		'equals',
		'does_not_equal',
		'greater_than',
		'less_than',
		'greater_than_or_equal_to',
		'less_than_or_equal_to',
	],
	verification: ['status'],
};

const TYPE_TO_FILTER_TYPE: Record<string, string> = {
	created_by: 'people',
	created_time: 'timestamp',
	email: 'rich_text',
	last_edited_by: 'people',
	last_edited_time: 'timestamp',
	phone_number: 'phone_number',
	title: 'rich_text',
	url: 'rich_text',
};

const FORMULA_RETURN_TYPES = ['checkbox', 'date', 'number', 'string'];
const ROLLUP_FILTER_HINT =
	'Provide the value for the Notion rollup filter object, for example {"number":{"greater_than":10}} or {"any":{"rich_text":{"contains":"Task"}}}.';

function conditionOptions(type: string) {
	return (CONDITION_OPTIONS[type] ?? []).map((entry) => ({
		name: capitalCase(entry),
		value: entry,
	}));
}

function typedConditionOptions(types: string[]) {
	return types.flatMap((type) => {
		const apiType = TYPE_TO_FILTER_TYPE[type] ?? type;
		const options = conditionOptions(apiType === 'timestamp' ? 'date' : apiType);
		if (!options.length) return [];

		return {
			displayName: 'Condition',
			name: 'condition',
			type: 'options',
			displayOptions: { show: { type: [type] } },
			options,
			default: '',
			description: 'The condition to filter by',
		} satisfies INodeProperties;
	});
}

function splitList(value: unknown) {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
	if (typeof value !== 'string') return '';

	const entries = value
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
	return entries.length > 1 ? entries : value;
}

function mapDateValue(value: unknown, timezone: string) {
	if (typeof value !== 'string') return '';
	if (!value) return '';

	return Number.isNaN(Date.parse(value)) ? value : moment.tz(value, timezone).utc().format();
}

function getFilterType(type: string) {
	return TYPE_TO_FILTER_TYPE[type] ?? type;
}

function assertConditionAllowed(filterType: string, condition: string) {
	const allowedConditions = CONDITION_OPTIONS[filterType];
	if (!allowedConditions?.includes(condition)) {
		throw new Error(
			`The condition "${condition}" is not supported for Notion ${filterType} filters`,
		);
	}
}

function conditionValue(
	filterType: string,
	condition: string,
	filter: FilterCondition,
	timezone: string,
) {
	if (EMPTY_CONDITIONS.includes(condition)) return true;
	if (RELATIVE_DATE_CONDITIONS.includes(condition)) return {};

	switch (filterType) {
		case 'checkbox':
			return filter.checkboxValue === true;
		case 'date':
			return mapDateValue(filter.dateValue, timezone);
		case 'number':
		case 'unique_id':
			return filter.numberValue;
		case 'people':
			return filter.peopleValue;
		case 'phone_number':
			return filter.richTextValue;
		case 'relation':
			return filter.relationValue;
		case 'rich_text':
			return filter.richTextValue;
		case 'select':
		case 'status':
		case 'multi_select':
			return splitList(filter.optionValue);
		case 'verification':
			return filter.verificationStatus;
		default:
			return '';
	}
}

function typeCondition(
	filterType: string,
	condition: string,
	filter: FilterCondition,
	timezone: string,
) {
	assertConditionAllowed(filterType, condition);
	return { [condition]: conditionValue(filterType, condition, filter, timezone) };
}

function mapRollupFilter(filter: FilterCondition) {
	if (typeof filter.rollupJson !== 'string' || !filter.rollupJson) return {};

	try {
		return JSON.parse(filter.rollupJson) as IDataObject;
	} catch {
		throw new Error('Rollup Filter (JSON) must be valid JSON');
	}
}

export function mapDataSourceFilter(filter: FilterCondition, timezone: string) {
	if (typeof filter.key !== 'string') return {};

	const { name, type } = splitPropertyKey(filter.key);
	const filterType = getFilterType(type);

	if (filterType === 'rollup') {
		return {
			property: name,
			rollup: mapRollupFilter(filter),
		};
	}

	if (typeof filter.condition !== 'string') return {};

	if (filterType === 'timestamp') {
		const timestamp = type;
		return {
			timestamp,
			[timestamp]: typeCondition('date', filter.condition, filter, timezone),
		};
	}

	if (filterType === 'formula') {
		const formulaType = filter.returnType === 'string' ? 'string' : filter.returnType;
		if (typeof formulaType !== 'string' || !FORMULA_RETURN_TYPES.includes(formulaType)) {
			throw new Error('Choose a formula return type before filtering');
		}

		return {
			property: name,
			formula: {
				[formulaType]: typeCondition(
					formulaType === 'string' ? 'rich_text' : formulaType,
					filter.condition,
					filter,
					timezone,
				),
			},
		};
	}

	return {
		property: name,
		[filterType]: typeCondition(filterType, filter.condition, filter, timezone),
	};
}

export function mapDataSourceFilters(filters: IDataObject[], matchType: string, timezone: string) {
	const mappedFilters = filters.map((filter) => mapDataSourceFilter(filter, timezone));
	if (!mappedFilters.length) return undefined;

	return matchType === 'allFilters' ? { and: mappedFilters } : { or: mappedFilters };
}

export function dataSourceSearchFilterDescriptions(): INodeProperties[] {
	const propertyTypes = [
		'checkbox',
		'created_by',
		'created_time',
		'date',
		'email',
		'files',
		'formula',
		'last_edited_by',
		'last_edited_time',
		'multi_select',
		'number',
		'people',
		'phone_number',
		'relation',
		'rich_text',
		'rollup',
		'select',
		'status',
		'title',
		'unique_id',
		'url',
		'verification',
	];

	return [
		{
			displayName: 'Filter',
			name: 'filterType',
			type: 'options',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Build Manually', value: 'manual' },
				{ name: 'JSON', value: 'json' },
			],
			displayOptions: { show: { resource: ['databasePage'], operation: ['getAll'] } },
			default: 'none',
		},
		{
			displayName: 'Must Match',
			name: 'matchType',
			type: 'options',
			options: [
				{ name: 'Any Filter', value: 'anyFilter' },
				{ name: 'All Filters', value: 'allFilters' },
			],
			displayOptions: {
				show: { resource: ['databasePage'], operation: ['getAll'], filterType: ['manual'] },
			},
			default: 'anyFilter',
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			displayOptions: {
				show: { resource: ['databasePage'], operation: ['getAll'], filterType: ['manual'] },
			},
			default: {},
			placeholder: 'Add Condition',
			options: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					values: [
						{
							displayName: 'Property Name or ID',
							name: 'key',
							type: 'options',
							typeOptions: {
								loadOptionsMethod: 'getFilterProperties',
								loadOptionsDependsOn: ['dataSourceId'],
							},
							default: '',
							description:
								'The name of the property to filter by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						},
						{
							displayName: 'Type',
							name: 'type',
							type: 'hidden',
							default: '={{$parameter["&key"].split("|").pop()}}',
						},
						...typedConditionOptions(
							propertyTypes.filter((type) => type !== 'formula' && type !== 'rollup'),
						),
						{
							displayName: 'Formula Return Type',
							name: 'returnType',
							type: 'options',
							displayOptions: { show: { type: ['formula'] } },
							options: FORMULA_RETURN_TYPES.map((type) => ({
								name: capitalCase(type),
								value: type,
							})),
							default: 'string',
						},
						...FORMULA_RETURN_TYPES.flatMap((returnType) =>
							typedConditionOptions([returnType === 'string' ? 'rich_text' : returnType]).map(
								(condition) => ({
									...condition,
									displayOptions: { show: { type: ['formula'], returnType: [returnType] } },
								}),
							),
						),
						{
							displayName: 'Rollup Filter (JSON)',
							name: 'rollupJson',
							type: 'json',
							typeOptions: { rows: 4 },
							default: '{}',
							displayOptions: { show: { type: ['rollup'] } },
							description: ROLLUP_FILTER_HINT,
						},
						{
							displayName: 'Text',
							name: 'richTextValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['email', 'phone_number', 'rich_text', 'title', 'url'],
								},
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Text',
							name: 'richTextValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									type: ['formula'],
									returnType: ['string'],
								},
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Number',
							name: 'numberValue',
							type: 'number',
							default: 0,
							displayOptions: {
								show: { type: ['number', 'unique_id'] },
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Number',
							name: 'numberValue',
							type: 'number',
							default: 0,
							displayOptions: {
								show: { type: ['formula'], returnType: ['number'] },
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Checked',
							name: 'checkboxValue',
							type: 'boolean',
							default: false,
							displayOptions: { show: { type: ['checkbox'] } },
						},
						{
							displayName: 'Checked',
							name: 'checkboxValue',
							type: 'boolean',
							default: false,
							displayOptions: { show: { type: ['formula'], returnType: ['checkbox'] } },
						},
						{
							displayName: 'Date',
							name: 'dateValue',
							type: 'string',
							default: '',
							description:
								'ISO 8601 date or a Notion relative date value like today, tomorrow, yesterday, one_week_ago, or one_month_from_now',
							displayOptions: {
								show: {
									type: ['created_time', 'date', 'last_edited_time'],
								},
								hide: {
									condition: [...EMPTY_CONDITIONS, ...RELATIVE_DATE_CONDITIONS],
								},
							},
						},
						{
							displayName: 'Date',
							name: 'dateValue',
							type: 'string',
							default: '',
							description:
								'ISO 8601 date or a Notion relative date value like today, tomorrow, yesterday, one_week_ago, or one_month_from_now',
							displayOptions: {
								show: {
									type: ['formula'],
									returnType: ['date'],
								},
								hide: {
									condition: [...EMPTY_CONDITIONS, ...RELATIVE_DATE_CONDITIONS],
								},
							},
						},
						{
							displayName: 'Option Name(s)',
							name: 'optionValue',
							type: 'string',
							default: '',
							description:
								'Option name. For select, status, and multi-select filters that support multiple values, separate names with commas.',
							displayOptions: {
								show: { type: ['multi_select', 'select', 'status'] },
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'User ID or Me',
							name: 'peopleValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: { type: ['created_by', 'last_edited_by', 'people'] },
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Relation Page ID',
							name: 'relationValue',
							type: 'string',
							default: '',
							displayOptions: {
								show: { type: ['relation'] },
								hide: { condition: [...EMPTY_CONDITIONS] },
							},
						},
						{
							displayName: 'Verification Status',
							name: 'verificationStatus',
							type: 'options',
							options: [
								{ name: 'Verified', value: 'verified' },
								{ name: 'Expired', value: 'expired' },
								{ name: 'None', value: 'none' },
							],
							default: 'verified',
							displayOptions: { show: { type: ['verification'] } },
						},
					],
				},
			],
		},
		{
			displayName:
				'See <a href="https://developers.notion.com/reference/filter-data-source-entries" target="_blank">Notion guide</a> to creating data source filters',
			name: 'jsonNotice',
			type: 'notice',
			displayOptions: {
				show: { resource: ['databasePage'], operation: ['getAll'], filterType: ['json'] },
			},
			default: '',
		},
		{
			displayName: 'Filters (JSON)',
			name: 'filterJson',
			type: 'json',
			typeOptions: { rows: 8 },
			default: '{}',
			displayOptions: {
				show: { resource: ['databasePage'], operation: ['getAll'], filterType: ['json'] },
			},
		},
	];
}
