import { ExpressionExtensionError } from '../errors/expression-extension.error';

import { DateTime } from 'luxon';
import type {
	DateTimeUnit,
	DurationLike,
	DurationObjectUnits,
	LocaleOptions,
	WeekdayNumbers,
} from 'luxon';
import type { ExtensionMap } from './Extensions';
import { convertToDateTime } from './utils';
import { toDateTime as stringToDateTime } from './StringExtensions';

const durationUnits = [
	'milliseconds',
	'seconds',
	'minutes',
	'hours',
	'days',
	'weeks',
	'months',
	'quarters',
	'years',
] as const;
type DurationUnit = (typeof durationUnits)[number];

const dateParts = [
	'day',
	'week',
	'month',
	'year',
	'hour',
	'minute',
	'second',
	'millisecond',
	'weekNumber',
	'yearDayNumber',
	'weekday',
] as const;
type DatePart = (typeof dateParts)[number];

const DURATION_MAP: Record<string, DurationUnit> = {
	day: 'days',
	month: 'months',
	year: 'years',
	week: 'weeks',
	hour: 'hours',
	minute: 'minutes',
	second: 'seconds',
	millisecond: 'milliseconds',
	ms: 'milliseconds',
	sec: 'seconds',
	secs: 'seconds',
	hr: 'hours',
	hrs: 'hours',
	min: 'minutes',
	mins: 'minutes',
};

const DATETIMEUNIT_MAP: Record<string, DateTimeUnit> = {
	days: 'day',
	months: 'month',
	years: 'year',
	hours: 'hour',
	minutes: 'minute',
	seconds: 'second',
	milliseconds: 'millisecond',
	hrs: 'hour',
	hr: 'hour',
	mins: 'minute',
	min: 'minute',
	secs: 'second',
	sec: 'second',
	ms: 'millisecond',
};

function isDateTime(date: unknown): date is DateTime {
	return date ? DateTime.isDateTime(date) : false;
}

function toDateTime(date: string | Date | DateTime): DateTime {
	if (isDateTime(date)) return date;

	if (typeof date === 'string') {
		return stringToDateTime(date);
	}

	return DateTime.fromJSDate(date);
}

function generateDurationObject(durationValue: number, unit: DurationUnit): DurationObjectUnits {
	const convertedUnit = DURATION_MAP[unit] || unit;
	return { [`${convertedUnit}`]: durationValue };
}

function beginningOf(date: Date | DateTime, extraArgs: DurationUnit[]): Date | DateTime {
	const [rawUnit = 'week'] = extraArgs;

	const unit = DATETIMEUNIT_MAP[rawUnit] || rawUnit;

	if (isDateTime(date)) return date.startOf(unit);

	return DateTime.fromJSDate(date).startOf(unit).toJSDate();
}

function endOfMonth(date: Date | DateTime): Date | DateTime {
	if (isDateTime(date)) return date.endOf('month');

	return DateTime.fromJSDate(date).endOf('month').toJSDate();
}

function extract(date: Date | DateTime, args: DatePart[]): number {
	let [part = 'week'] = args;

	if (part === 'yearDayNumber') {
		date = isDateTime(date) ? date.toJSDate() : date;

		const firstDayOfTheYear = new Date(date.getFullYear(), 0, 0);

		const diff =
			date.getTime() -
			firstDayOfTheYear.getTime() +
			(firstDayOfTheYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;

		return Math.floor(diff / (1000 * 60 * 60 * 24));
	}

	if (part === 'week') part = 'weekNumber';

	const unit = (DATETIMEUNIT_MAP[part] as keyof DateTime) || part;

	if (isDateTime(date)) return date.get(unit);

	return DateTime.fromJSDate(date).get(unit);
}

function format(date: Date | DateTime, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts = {}] = extraArgs as [string, LocaleOptions];
	if (isDateTime(date)) {
		return date.toFormat(dateFormat, { ...localeOpts });
	}
	return DateTime.fromJSDate(date).toFormat(dateFormat, { ...localeOpts });
}

function isBetween(
	date: Date | DateTime,
	extraArgs: Array<string | Date | DateTime>,
): boolean | undefined {
	if (extraArgs.length !== 2) {
		throw new ExpressionExtensionError('isBetween(): expected exactly two args');
	}

	const [first, second] = extraArgs;

	const firstDate = convertToDateTime(first);
	const secondDate = convertToDateTime(second);

	if (!firstDate || !secondDate) {
		return;
	}

	if (firstDate > secondDate) {
		return secondDate < date && date < firstDate;
	}
	return secondDate > date && date > firstDate;
}

function isDst(date: Date | DateTime): boolean {
	if (isDateTime(date)) {
		return date.isInDST;
	}
	return DateTime.fromJSDate(date).isInDST;
}

function isInLast(date: Date | DateTime, extraArgs: unknown[]): boolean {
	const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];

	const dateInThePast = DateTime.now().minus(generateDurationObject(durationValue, unit));
	let thisDate = date;
	if (!isDateTime(thisDate)) {
		thisDate = DateTime.fromJSDate(thisDate);
	}
	return dateInThePast <= thisDate && thisDate <= DateTime.now();
}

const WEEKEND_DAYS: WeekdayNumbers[] = [6, 7];
function isWeekend(date: Date | DateTime): boolean {
	const { weekday } = isDateTime(date) ? date : DateTime.fromJSDate(date);
	return WEEKEND_DAYS.includes(weekday);
}

function minus(
	date: Date | DateTime,
	args: [DurationLike] | [number, DurationUnit],
): Date | DateTime {
	if (args.length === 1) {
		const [arg] = args;

		if (isDateTime(date)) return date.minus(arg);

		return DateTime.fromJSDate(date).minus(arg).toJSDate();
	}

	const [durationValue = 0, unit = 'minutes'] = args;

	const duration = generateDurationObject(durationValue, unit);

	if (isDateTime(date)) return date.minus(duration);

	return DateTime.fromJSDate(date).minus(duration).toJSDate();
}

function plus(
	date: Date | DateTime,
	args: [DurationLike] | [number, DurationUnit],
): Date | DateTime {
	if (args.length === 1) {
		const [arg] = args;

		if (isDateTime(date)) return date.plus(arg);

		return DateTime.fromJSDate(date).plus(arg).toJSDate();
	}

	const [durationValue = 0, unit = 'minutes'] = args;

	const duration = generateDurationObject(durationValue, unit);

	if (isDateTime(date)) return date.plus(duration);

	return DateTime.fromJSDate(date).plus(duration).toJSDate();
}

function diffTo(date: DateTime, args: [string | Date | DateTime, DurationUnit | DurationUnit[]]) {
	const [otherDate, unit = 'days'] = args;
	let units = Array.isArray(unit) ? unit : [unit];

	if (units.length === 0) {
		units = ['days'];
	}

	const allowedUnitSet = new Set([...dateParts, ...durationUnits]);
	const errorUnit = units.find((u) => !allowedUnitSet.has(u));

	if (errorUnit) {
		throw new ExpressionExtensionError(
			`Unsupported unit '${String(errorUnit)}'. Supported: ${durationUnits
				.map((u) => `'${u}'`)
				.join(', ')}.`,
		);
	}

	const diffResult = date.diff(toDateTime(otherDate), units);

	if (units.length > 1) {
		return diffResult.toObject();
	}

	return diffResult.as(units[0]);
}

function diffToNow(date: DateTime, args: [DurationUnit | DurationUnit[]]) {
	const [unit] = args;
	return diffTo(date, [DateTime.now(), unit]);
}

function toInt(date: Date | DateTime): number {
	if (isDateTime(date)) {
		return date.toMillis();
	}
	return date.getTime();
}

const toFloat = toInt;

function toBoolean() {
	return undefined;
}

endOfMonth.doc = {
	name: 'endOfMonth',
	returnType: 'DateTime',
	hidden: true,
	description: 'Transforms a date to the last possible moment that lies within the month.',
	section: 'edit',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-endOfMonth',
};

isDst.doc = {
	name: 'isDst',
	returnType: 'boolean',
	hidden: true,
	description: 'Checks if a Date is within Daylight Savings Time.',
	section: 'query',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-isDst',
};

isWeekend.doc = {
	name: 'isWeekend',
	returnType: 'boolean',
	hidden: true,
	description: 'Checks if the Date falls on a Saturday or Sunday.',
	section: 'query',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-isWeekend',
};

beginningOf.doc = {
	name: 'beginningOf',
	description: 'Transform a Date to the start of the given time period. Default unit is `week`.',
	section: 'edit',
	hidden: true,
	returnType: 'DateTime',
	args: [{ name: 'unit?', type: 'DurationUnit' }],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-beginningOf',
};

extract.doc = {
	name: 'extract',
	description:
		'Extracts a part of the date or time, e.g. the month, as a number. To extract textual names instead, see <code>format()</code>.',
	examples: [
		{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.extract('month')", evaluated: '3' },
		{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.extract('hour')", evaluated: '18' },
	],
	section: 'query',
	returnType: 'number',
	args: [
		{
			name: 'unit',
			optional: true,
			description:
				'The part of the date or time to return. One of: <code>year</code>, <code>month</code>, <code>week</code>, <code>day</code>, <code>hour</code>, <code>minute</code>, <code>second</code>',
			default: '"week"',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-extract',
};

format.doc = {
	name: 'format',
	description:
		'Converts the DateTime to a string, using the format specified. <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">Formatting guide</a>. For common formats, <code>toLocaleString()</code> may be easier.',
	examples: [
		{
			example: "dt = '2024-04-30T18:49'.toDateTime()\ndt.format('dd/LL/yyyy')",
			evaluated: "'30/04/2024'",
		},
		{
			example: "dt = '2024-04-30T18:49'.toDateTime()\ndt.format('dd LLL yy')",
			evaluated: "'30 Apr 24'",
		},
		{
			example: "dt = '2024-04-30T18:49'.toDateTime()\ndt.setLocale('fr').format('dd LLL yyyy')",
			evaluated: "'30 avr. 2024'",
		},
		{
			example: "dt = '2024-04-30T18:49'.toDateTime()\ndt.format(\"HH 'hours and' mm 'minutes'\")",
			evaluated: "'18 hours and 49 minutes'",
		},
	],
	returnType: 'string',
	section: 'format',
	args: [
		{
			name: 'fmt',
			description:
				'The <a target="_blank" href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens">format</a> of the string to return ',
			default: "'yyyy-MM-dd'",
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-format',
};

isBetween.doc = {
	name: 'isBetween',
	description: 'Returns <code>true</code> if the DateTime lies between the two moments specified',
	examples: [
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.isBetween('2020-06-01', '2025-06-01')",
			evaluated: 'true',
		},
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.isBetween('2020', '2025')",
			evaluated: 'true',
		},
	],
	section: 'compare',
	returnType: 'boolean',
	args: [
		{
			name: 'date1',
			description:
				'The moment that the base DateTime must be after. Can be an ISO date string or a Luxon DateTime.',
			type: 'string | DateTime',
		},
		{
			name: 'date2',
			description:
				'The moment that the base DateTime must be before. Can be an ISO date string or a Luxon DateTime.',
			type: 'string | DateTime',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-isBetween',
};

isInLast.doc = {
	name: 'isInLast',
	hidden: true,
	description: 'Checks if a Date is within a given time period. Default unit is `minute`.',
	section: 'query',
	returnType: 'boolean',
	args: [
		{ name: 'n', type: 'number' },
		{ name: 'unit?', type: 'DurationUnit' },
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-isInLast',
};

toDateTime.doc = {
	name: 'toDateTime',
	description:
		'Converts a JavaScript Date to a Luxon DateTime. The DateTime contains the same information, but is easier to manipulate.',
	examples: [
		{
			example: "jsDate = new Date('2024-03-30T18:49')\njsDate.toDateTime().plus(5, 'days')",
			evaluated: '[DateTime: 2024-05-05T18:49:00.000Z]',
		},
	],
	returnType: 'DateTime',
	hidden: true,
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-toDateTime',
};

minus.doc = {
	name: 'minus',
	description: 'Subtracts a given period of time from the DateTime',
	examples: [
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.minus(7, 'days')",
			evaluated: '[DateTime: 2024-04-23T18:49:00.000Z]',
		},
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.minus(4, 'years')",
			evaluated: '[DateTime: 2020-04-30T18:49:00.000Z]',
		},
	],
	section: 'edit',
	returnType: 'DateTime',
	args: [
		{
			name: 'n',
			description:
				'The number of units to subtract. Or use a Luxon <a target="_blank" href=”https://moment.github.io/luxon/api-docs/index.html#duration”>Duration</a> object to subtract multiple units at once.',
			type: 'number | object',
		},
		{
			name: 'unit',
			optional: true,
			description:
				'The units of the number. One of: <code>years</code>, <code>months</code>, <code>weeks</code>, <code>days</code>, <code>hours</code>, <code>minutes</code>, <code>seconds</code>, <code>milliseconds</code>',
			default: '"milliseconds"',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-minus',
};

plus.doc = {
	name: 'plus',
	description: 'Adds a given period of time to the DateTime',
	examples: [
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.plus(7, 'days')",
			evaluated: '[DateTime: 2024-04-07T18:49:00.000Z]',
		},
		{
			example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.plus(4, 'years')",
			evaluated: '[DateTime: 2028-03-30T18:49:00.000Z]',
		},
	],
	section: 'edit',
	returnType: 'DateTime',
	args: [
		{
			name: 'n',
			description:
				'The number of units to add. Or use a Luxon <a target="_blank" href=”https://moment.github.io/luxon/api-docs/index.html#duration”>Duration</a> object to add multiple units at once.',
			type: 'number | object',
		},
		{
			name: 'unit',
			optional: true,
			description:
				'The units of the number. One of: <code>years</code>, <code>months</code>, <code>weeks</code>, <code>days</code>, <code>hours</code>, <code>minutes</code>, <code>seconds</code>, <code>milliseconds</code>',
			default: '"milliseconds"',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-plus',
};

diffTo.doc = {
	name: 'diffTo',
	description: 'Returns the difference between two DateTimes, in the given unit(s)',
	examples: [
		{
			example: "dt = '2025-01-01'.toDateTime()\ndt.diffTo('2024-03-30T18:49:07.234', 'days')",
			evaluated: '276.21',
		},
		{
			example:
				"dt1 = '2025-01-01T00:00:00.000'.toDateTime();\ndt2 = '2024-03-30T18:49:07.234'.toDateTime();\ndt1.diffTo(dt2, ['months', 'days'])",
			evaluated: '{ months: 9, days: 1.21 }',
		},
	],
	section: 'compare',
	returnType: 'number | Record<DurationUnit, number>',
	args: [
		{
			name: 'otherDateTime',
			default: '$now',
			description:
				'The moment to subtract the base DateTime from. Can be an ISO date string or a Luxon DateTime.',
			type: 'string | DateTime',
		},
		{
			name: 'unit',
			default: "'days'",
			description:
				'The unit, or array of units, to return the result in. Possible values: <code>years</code>, <code>months</code>, <code>weeks</code>, <code>days</code>, <code>hours</code>, <code>minutes</code>, <code>seconds</code>, <code>milliseconds</code>.',
			type: 'string | string[]',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-diffTo',
};

diffToNow.doc = {
	name: 'diffToNow',
	description:
		'Returns the difference between the current moment and the DateTime, in the given unit(s). For a textual representation, use <code>toRelative()</code> instead.',
	examples: [
		{
			example: "dt = '2023-03-30T18:49:07.234'.toDateTime()\ndt.diffToNow('days')",
			evaluated: '371.9',
		},
		{
			example: "dt = '2023-03-30T18:49:07.234.toDateTime()\ndt.diffToNow(['months', 'days'])",
			evaluated: '{ months: 12, days: 5.9 }',
		},
	],
	section: 'compare',
	returnType: 'number | Record<DurationUnit, number>',
	args: [
		{
			name: 'unit',
			description:
				'The unit, or array of units, to return the result in. Possible values: <code>years</code>, <code>months</code>, <code>weeks</code>, <code>days</code>, <code>hours</code>, <code>minutes</code>, <code>seconds</code>, <code>milliseconds</code>.',
			default: "'days'",
			type: 'string | string[]',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/dates/#date-diffToNow',
};

export const dateExtensions: ExtensionMap = {
	typeName: 'Date',
	functions: {
		beginningOf,
		endOfMonth,
		extract,
		isBetween,
		isDst,
		isInLast,
		isWeekend,
		minus,
		plus,
		format,
		toDateTime,
		diffTo,
		diffToNow,
		toInt,
		toFloat,
		toBoolean,
	},
};
