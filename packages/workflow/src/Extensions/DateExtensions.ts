import { ExpressionExtensionError } from './../ExpressionError';
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { DateTime as LuxonDateTime } from 'luxon';
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

function isLuxonDateTime(date: unknown): date is LuxonDateTime {
	return date ? LuxonDateTime.isDateTime(date) : false;
}

const toLuxonDateTime = (d: Date | LuxonDateTime) =>
	LuxonDateTime.isDateTime(d) ? d : LuxonDateTime.fromJSDate(d);

export const run = <T>(fn: () => T): T => fn();

function generateDurationObject(durationValue: number, unit: DurationUnit) {
	const convertedUnit = DURATION_MAP[unit] || unit;
	return { [`${convertedUnit}`]: durationValue } as DurationObjectUnits;
}

function beginningOf(date: Date | LuxonDateTime, extraArgs: DurationUnit[]): string {
	const [unit = 'week'] = extraArgs;

	return toLuxonDateTime(date)
		.startOf(DATETIMEUNIT_MAP[unit] || unit)
		.toISO();
}

function endOfMonth(date: Date | LuxonDateTime): string {
	return toLuxonDateTime(date).endOf('month').toISO();
}

function extract(inputDate: Date | LuxonDateTime, extraArgs: DatePart[]): number {
	let [part = 'week'] = extraArgs;
	let date = inputDate;
	if (isLuxonDateTime(date)) {
		date = date.toJSDate();
	}
	if (part === 'yearDayNumber') {
		const firstDayOfTheYear = new Date(date.getFullYear(), 0, 0);
		const diff =
			date.getTime() -
			firstDayOfTheYear.getTime() +
			(firstDayOfTheYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
		return Math.floor(diff / (1000 * 60 * 60 * 24));
	}

	if (part === 'week') {
		part = 'weekNumber';
	}

	return LuxonDateTime.fromJSDate(date).get(
		(DATETIMEUNIT_MAP[part] as keyof LuxonDateTime) || part,
	);
}

function format(date: Date | LuxonDateTime, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts = {}] = extraArgs as [string, LocaleOptions];

	return toLuxonDateTime(date).toFormat(dateFormat, { ...localeOpts });
}

function isBetween(
	date: Date | LuxonDateTime,
	extraArgs: Array<string | Date | LuxonDateTime>,
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

function isDst(date: Date | LuxonDateTime): boolean {
	return toLuxonDateTime(date).isInDST;
}

function isInLast(date: Date | LuxonDateTime, extraArgs: unknown[]): boolean {
	const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];

	const dateInThePast = LuxonDateTime.now().minus(generateDurationObject(durationValue, unit));
	let thisDate = date;
	if (!isLuxonDateTime(thisDate)) {
		thisDate = LuxonDateTime.fromJSDate(thisDate);
	}
	return dateInThePast <= thisDate && thisDate <= LuxonDateTime.now();
}

const WEEKEND_DAYS: WeekdayNumbers[] = [6, 7];
function isWeekend(date: Date | LuxonDateTime): boolean {
	const { weekday } = toLuxonDateTime(date);
	return WEEKEND_DAYS.includes(weekday);
}

function minus(date: Date | LuxonDateTime, extraArgs: unknown[]): string {
	const [arg] = extraArgs as [DurationLike];

	if (isLuxonDateTime(date) && arg) return date.minus(arg).toISO();

	const duration = run(() => {
		const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];
		return generateDurationObject(durationValue, unit);
	});

	return toLuxonDateTime(date).minus(duration).toISO();
}

function plus(date: Date | LuxonDateTime, extraArgs: unknown[]): string {
	const [arg] = extraArgs as [DurationLike | undefined];

	if (isLuxonDateTime(date) && arg) return date.plus(arg).toISO();

	const duration = run(() => {
		const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];
		return generateDurationObject(durationValue, unit);
	});

	return toLuxonDateTime(date).plus(duration).toISO();
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
