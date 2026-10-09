import moment from 'moment-timezone';
import type { IDataObject } from 'n8n-workflow';

import { splitPropertyKey } from '../../helpers/utils';
import { isDataObject } from '../../transport';

// Notion only knows a formula's result type once it evaluates it. When a formula
// can resolve to more than one type (for example `if(prop("Done"), now(), "")`),
// Notion rejects every query filter on it, whichever return type the node sends.
// The pages still carry the computed value, so those conditions are evaluated here.
const FORMULA_UNKNOWN_TYPE_PATTERN = /unable to filter based on a formula of unknown type/i;

const RETURN_TYPE_TO_VALUE_TYPE: Record<string, string> = {
	checkbox: 'boolean',
	date: 'date',
	number: 'number',
	string: 'string',
};

const RELATIVE_DATE_VALUES: Record<string, (now: moment.Moment) => moment.Moment> = {
	today: (now) => now,
	tomorrow: (now) => now.add(1, 'day'),
	yesterday: (now) => now.subtract(1, 'day'),
	one_week_ago: (now) => now.subtract(1, 'week'),
	one_week_from_now: (now) => now.add(1, 'week'),
	one_month_ago: (now) => now.subtract(1, 'month'),
	one_month_from_now: (now) => now.add(1, 'month'),
};

const RELATIVE_DATE_RANGES: Record<string, (now: moment.Moment) => [moment.Moment, moment.Moment]> =
	{
		past_week: (now) => [now.clone().subtract(1, 'week'), now],
		past_month: (now) => [now.clone().subtract(1, 'month'), now],
		past_year: (now) => [now.clone().subtract(1, 'year'), now],
		next_week: (now) => [now, now.clone().add(1, 'week')],
		next_month: (now) => [now, now.clone().add(1, 'month')],
		next_year: (now) => [now, now.clone().add(1, 'year')],
		this_week: (now) => [now.clone().startOf('week'), now.clone().endOf('week')],
	};

export function isFormulaOfUnknownTypeError(error: unknown) {
	if (!isDataObject(error)) return false;
	return [error.message, error.description].some(
		(value) => typeof value === 'string' && FORMULA_UNKNOWN_TYPE_PATTERN.test(value),
	);
}

export function isFormulaFilter(filter: IDataObject) {
	return typeof filter.key === 'string' && splitPropertyKey(filter.key).type === 'formula';
}

function getFormulaValue(page: IDataObject, propertyName: string, returnType: string) {
	const properties = page.properties;
	if (!isDataObject(properties)) return null;
	const property = properties[propertyName];
	if (!isDataObject(property) || !isDataObject(property.formula)) return null;

	// A value of another type than the one selected is treated as empty, the same
	// way Notion treats it for formulas that do have a single type
	const valueType = RETURN_TYPE_TO_VALUE_TYPE[returnType];
	if (property.formula.type !== valueType) return null;
	return property.formula[valueType] ?? null;
}

function matchesString(value: unknown, condition: string, expected: string) {
	const text = typeof value === 'string' ? value : '';
	switch (condition) {
		case 'equals':
			return text === expected;
		case 'does_not_equal':
			return text !== expected;
		case 'contains':
			return text.includes(expected);
		case 'does_not_contain':
			return !text.includes(expected);
		case 'starts_with':
			return text.startsWith(expected);
		case 'ends_with':
			return text.endsWith(expected);
		case 'is_empty':
			return text === '';
		case 'is_not_empty':
			return text !== '';
		default:
			return false;
	}
}

function matchesNumber(value: unknown, condition: string, expected: number) {
	if (condition === 'is_empty') return typeof value !== 'number';
	if (condition === 'is_not_empty') return typeof value === 'number';
	if (condition === 'does_not_equal') return value !== expected;
	if (typeof value !== 'number') return false;

	switch (condition) {
		case 'equals':
			return value === expected;
		case 'greater_than':
			return value > expected;
		case 'less_than':
			return value < expected;
		case 'greater_than_or_equal_to':
			return value >= expected;
		case 'less_than_or_equal_to':
			return value <= expected;
		default:
			return false;
	}
}

function matchesCheckbox(value: unknown, condition: string, expected: boolean) {
	const checked = value === true;
	if (condition === 'equals') return checked === expected;
	if (condition === 'does_not_equal') return checked !== expected;
	return false;
}

function parseExpectedDate(value: unknown, timezone: string) {
	if (typeof value !== 'string' || !value) return undefined;

	const relativeDate = RELATIVE_DATE_VALUES[value];
	if (relativeDate) {
		return { date: relativeDate(moment.tz(timezone)), dateOnly: true };
	}

	const date = moment.tz(value, moment.ISO_8601, timezone);
	if (!date.isValid()) return undefined;
	return { date, dateOnly: !value.includes('T') };
}

function matchesDate(value: unknown, condition: string, filter: IDataObject, timezone: string) {
	const start = isDataObject(value) && typeof value.start === 'string' ? value.start : undefined;
	if (condition === 'is_empty') return start === undefined;
	if (condition === 'is_not_empty') return start !== undefined;
	if (start === undefined) return false;

	const date = moment.tz(start, moment.ISO_8601, timezone);
	if (!date.isValid()) return false;

	const relativeRange = RELATIVE_DATE_RANGES[condition];
	if (relativeRange) {
		const [from, to] = relativeRange(moment.tz(timezone));
		return date.isBetween(from, to, undefined, '[]');
	}

	const expected = parseExpectedDate(filter.dateValue, timezone);
	if (!expected) return false;
	const granularity = expected.dateOnly ? 'day' : undefined;

	switch (condition) {
		case 'equals':
			return date.isSame(expected.date, granularity);
		case 'before':
			return date.isBefore(expected.date, granularity);
		case 'after':
			return date.isAfter(expected.date, granularity);
		case 'on_or_before':
			return date.isSameOrBefore(expected.date, granularity);
		case 'on_or_after':
			return date.isSameOrAfter(expected.date, granularity);
		default:
			return false;
	}
}

export function matchesFormulaFilter(page: IDataObject, filter: IDataObject, timezone: string) {
	if (typeof filter.key !== 'string' || typeof filter.condition !== 'string') return true;

	const { name } = splitPropertyKey(filter.key);
	const returnType = typeof filter.returnType === 'string' ? filter.returnType : 'string';
	const value = getFormulaValue(page, name, returnType);

	switch (returnType) {
		case 'checkbox':
			return matchesCheckbox(value, filter.condition, filter.checkboxValue === true);
		case 'date':
			return matchesDate(value, filter.condition, filter, timezone);
		case 'number':
			return matchesNumber(value, filter.condition, Number(filter.numberValue));
		default:
			return matchesString(value, filter.condition, String(filter.richTextValue ?? ''));
	}
}
