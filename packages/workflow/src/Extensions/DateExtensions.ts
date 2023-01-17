/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import {
	DateTime,
	DateTimeFormatOptions,
	DateTimeUnit,
	Duration,
	DurationLike,
	DurationObjectUnits,
	LocaleOptions,
} from 'luxon';
import type { ExtensionMap } from './Extensions';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDateTime(date: any): date is DateTime {
	if (date) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return DateTime.isDateTime(date);
	}
	return false;
}

function generateDurationObject(durationValue: number, unit: DurationUnit) {
	const convertedUnit = DURATION_MAP[unit] || unit;
	return { [`${convertedUnit}`]: durationValue } as DurationObjectUnits;
}

function beginningOf(date: Date | DateTime, extraArgs: DurationUnit[]): Date {
	const [unit = 'week'] = extraArgs;

	if (isDateTime(date)) {
		return date.startOf(DATETIMEUNIT_MAP[unit] || unit).toJSDate();
	}
	let datetime = DateTime.fromJSDate(date);
	if (date.getTimezoneOffset() === 0) {
		datetime = datetime.setZone('UTC');
	}
	return datetime.startOf(DATETIMEUNIT_MAP[unit] || unit).toJSDate();
}

function endOfMonth(date: Date | DateTime): Date {
	if (isDateTime(date)) {
		return date.endOf('month').toJSDate();
	}
	return DateTime.fromJSDate(date).endOf('month').toJSDate();
}

function extract(inputDate: Date | DateTime, extraArgs: DatePart[]): number | Date {
	const [part] = extraArgs;
	let date = inputDate;
	if (isDateTime(date)) {
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

	return DateTime.fromJSDate(date).get((DATETIMEUNIT_MAP[part] as keyof DateTime) || part);
}

function format(date: Date | DateTime, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts = {}] = extraArgs as [string, LocaleOptions];
	if (isDateTime(date)) {
		return date.toFormat(dateFormat, { ...localeOpts });
	}
	return DateTime.fromJSDate(date).toFormat(dateFormat, { ...localeOpts });
}

function isBetween(date: Date | DateTime, extraArgs: unknown[]): boolean {
	const [first, second] = extraArgs as string[];
	const firstDate = new Date(first);
	const secondDate = new Date(second);

	if (firstDate > secondDate) {
		return secondDate < date && date < firstDate;
	}
	return secondDate > date && date > firstDate;
}

function isDst(date: Date): boolean {
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

function isWeekend(date: Date): boolean {
	enum DAYS {
		saturday = 6,
		sunday = 7,
	}
	return [DAYS.saturday, DAYS.sunday].includes(DateTime.fromJSDate(date).weekday);
}

function minus(date: Date | DateTime, extraArgs: unknown[]): Date | DateTime {
	if (isDateTime(date) && extraArgs.length === 1) {
		return date.minus(extraArgs[0] as DurationLike);
	}

	const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];

	if (isDateTime(date)) {
		return date.minus(generateDurationObject(durationValue, unit)).toJSDate();
	}
	return DateTime.fromJSDate(date).minus(generateDurationObject(durationValue, unit)).toJSDate();
}

function plus(date: Date | DateTime, extraArgs: unknown[]): Date | DateTime {
	if (isDateTime(date) && extraArgs.length === 1) {
		return date.plus(extraArgs[0] as DurationLike);
	}

	const [durationValue = 0, unit = 'minutes'] = extraArgs as [number, DurationUnit];

	if (isDateTime(date)) {
		return date.plus(generateDurationObject(durationValue, unit)).toJSDate();
	}
	return DateTime.fromJSDate(date).plus(generateDurationObject(durationValue, unit)).toJSDate();
}

function toLocaleString(date: Date | DateTime, extraArgs: unknown[]): string {
	const [locale, dateFormat = { timeStyle: 'short', dateStyle: 'short' }] = extraArgs as [
		string | undefined,
		DateTimeFormatOptions,
	];

	if (isDateTime(date)) {
		return date.toLocaleString(dateFormat, { locale });
	}
	return DateTime.fromJSDate(date).toLocaleString(dateFormat, { locale });
}

function toTimeFromNow(date: Date): string {
	let diffObj: Duration;
	if (isDateTime(date)) {
		diffObj = date.diffNow();
	} else {
		diffObj = DateTime.fromJSDate(date).diffNow();
	}

	const as = (unit: DurationUnit) => {
		return Math.round(Math.abs(diffObj.as(unit)));
	};

	if (as('years')) {
		return `${as('years')} years ago`;
	}
	if (as('months')) {
		return `${as('months')} months ago`;
	}
	if (as('weeks')) {
		return `${as('weeks')} weeks ago`;
	}
	if (as('days')) {
		return `${as('days')} days ago`;
	}
	if (as('hours')) {
		return `${as('hours')} hours ago`;
	}
	if (as('minutes')) {
		return `${as('minutes')} minutes ago`;
	}
	if (as('seconds') && as('seconds') > 10) {
		return `${as('seconds')} seconds ago`;
	}
	return 'just now';
}

function timeTo(date: Date | DateTime, extraArgs: unknown[]): Duration {
	const [diff = new Date().toISOString(), unit = 'seconds'] = extraArgs as [string, DurationUnit];
	const diffDate = new Date(diff);
	if (isDateTime(date)) {
		return date.diff(DateTime.fromJSDate(diffDate), DURATION_MAP[unit] || unit);
	}
	return DateTime.fromJSDate(date).diff(DateTime.fromJSDate(diffDate), DURATION_MAP[unit] || unit);
}

function toDate(date: Date | DateTime) {
	if (isDateTime(date)) {
		return date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toJSDate();
	}
	let datetime = DateTime.fromJSDate(date);
	if (date.getTimezoneOffset() === 0) {
		datetime = datetime.setZone('UTC');
	}
	return datetime.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toJSDate();
}

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
		toTimeFromNow,
		timeTo,
		format,
		toLocaleString,
		toDate,
	},
};
