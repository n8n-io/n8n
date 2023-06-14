import { ExpressionExtensionError } from './../ExpressionError';
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
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

type DurationUnit =
	| 'milliseconds'
	| 'seconds'
	| 'minutes'
	| 'hours'
	| 'days'
	| 'weeks'
	| 'months'
	| 'quarter'
	| 'years';
type DatePart =
	| 'day'
	| 'week'
	| 'month'
	| 'year'
	| 'hour'
	| 'minute'
	| 'second'
	| 'millisecond'
	| 'weekNumber'
	| 'yearDayNumber'
	| 'weekday';

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

endOfMonth.doc = {
	name: 'endOfMonth',
	returnType: 'Date',
	description: 'Transforms a date to the last possible moment that lies within the month.',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-endOfMonth',
};

isDst.doc = {
	name: 'isDst',
	returnType: 'boolean',
	description: 'Checks if a Date is within Daylight Savings Time.',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-isDst',
};

isWeekend.doc = {
	name: 'isWeekend',
	returnType: 'boolean',
	description: 'Checks if the Date falls on a Saturday or Sunday.',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-isWeekend',
};

beginningOf.doc = {
	name: 'beginningOf',
	description: 'Transform a Date to the start of the given time period. Default unit is `week`.',
	returnType: 'Date',
	args: [{ name: 'unit?', type: 'DurationUnit' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-beginningOf',
};

extract.doc = {
	name: 'extract',
	description: 'Extracts the part defined in `datePart` from a Date. Default unit is `week`.',
	returnType: 'number',
	args: [{ name: 'datePart?', type: 'DurationUnit' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-extract',
};

format.doc = {
	name: 'format',
	description: 'Formats a Date in the given structure.',
	returnType: 'string',
	args: [{ name: 'fmt', type: 'TimeFormat' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-format',
};

isBetween.doc = {
	name: 'isBetween',
	description: 'Checks if a Date is between two given dates.',
	returnType: 'boolean',
	args: [
		{ name: 'date1', type: 'Date|string' },
		{ name: 'date2', type: 'Date|string' },
	],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-isBetween',
};

isInLast.doc = {
	name: 'isInLast',
	description: 'Checks if a Date is within a given time period. Default unit is `minute`.',
	returnType: 'boolean',
	args: [
		{ name: 'n', type: 'number' },
		{ name: 'unit?', type: 'DurationUnit' },
	],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-isInLast',
};

minus.doc = {
	name: 'minus',
	description: 'Subtracts a given time period from a Date. Default unit is `minute`.',
	returnType: 'Date',
	args: [
		{ name: 'n', type: 'number' },
		{ name: 'unit?', type: 'DurationUnit' },
	],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-minus',
};

plus.doc = {
	name: 'plus',
	description: 'Adds a given time period to a Date. Default unit is `minute`.',
	returnType: 'Date',
	args: [
		{ name: 'n', type: 'number' },
		{ name: 'unit?', type: 'DurationUnit' },
	],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/dates/#date-plus',
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
	},
};
