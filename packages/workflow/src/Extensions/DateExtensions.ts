/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import {
	DateTime,
	DateTimeFormatOptions,
	Duration,
	DurationObjectUnits,
	LocaleOptions,
} from 'luxon';
import { ExtensionMap } from './Extensions';

type DurationUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
type DatePart =
	| 'day'
	| 'month'
	| 'year'
	| 'hour'
	| 'minute'
	| 'second'
	| 'weekNumber'
	| 'yearDayNumber'
	| 'weekday';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDateTime(date: any): date is DateTime {
	if (date) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return 'isLuxonDateTime' in date && !!date.isLuxonDateTime;
	}
	return false;
}

function generateDurationObject(durationValue: number, unit: DurationUnit) {
	return { [`${unit}s`]: durationValue } as DurationObjectUnits;
}

function beginningOf(date: Date | DateTime, extraArgs: DurationUnit[]): Date {
	const [unit = 'week'] = extraArgs;

	if (isDateTime(date)) {
		return date.startOf(unit).toJSDate();
	}
	return DateTime.fromJSDate(date).startOf(unit).toJSDate();
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

	return DateTime.fromJSDate(date).get(part);
}

function format(date: Date | DateTime, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts] = extraArgs as [string, LocaleOptions];
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
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

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

function minus(date: Date | DateTime, extraArgs: unknown[]): Date {
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

	if (isDateTime(date)) {
		return date.minus(generateDurationObject(durationValue, unit)).toJSDate();
	}
	return DateTime.fromJSDate(date).minus(generateDurationObject(durationValue, unit)).toJSDate();
}

function plus(date: Date | DateTime, extraArgs: unknown[]): Date {
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

	if (isDateTime(date)) {
		return date.plus(generateDurationObject(durationValue, unit)).toJSDate();
	}
	return DateTime.fromJSDate(date).plus(generateDurationObject(durationValue, unit)).toJSDate();
}

function toLocaleString(date: Date | DateTime, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts] = extraArgs as [DateTimeFormatOptions, LocaleOptions];

	if (isDateTime(date)) {
		return date.toLocaleString(dateFormat, localeOpts);
	}
	return DateTime.fromJSDate(date).toLocaleString(dateFormat, localeOpts);
}

function toTimeFromNow(date: Date): string {
	let diffObj: DurationObjectUnits;
	if (isDateTime(date)) {
		diffObj = date.diffNow().toObject();
	} else {
		diffObj = DateTime.fromJSDate(date).diffNow().toObject();
	}

	if (diffObj.years) {
		return `${diffObj.years} years ago`;
	}
	if (diffObj.months) {
		return `${diffObj.months} months ago`;
	}
	if (diffObj.weeks) {
		return `${diffObj.weeks} weeks ago`;
	}
	if (diffObj.days) {
		return `${diffObj.days} days ago`;
	}
	if (diffObj.hours) {
		return `${diffObj.hours} hours ago`;
	}
	if (diffObj.minutes) {
		return `${diffObj.minutes} minutes ago`;
	}
	if (diffObj.seconds && diffObj.seconds > 10) {
		return `${diffObj.seconds} seconds ago`;
	}
	return 'just now';
}

function timeTo(date: Date | DateTime, extraArgs: unknown[]): Duration {
	const [diff = new Date().toISOString(), unit = 'seconds'] = extraArgs as [string, DurationUnit];
	const diffDate = new Date(diff);
	if (isDateTime(date)) {
		return date.diff(DateTime.fromJSDate(diffDate), unit);
	}
	return DateTime.fromJSDate(date).diff(DateTime.fromJSDate(diffDate), unit);
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
	},
};
