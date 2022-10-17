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

function generateDurationObject(durationValue: number, unit: DurationUnit) {
	return { [`${unit}s`]: durationValue } as DurationObjectUnits;
}

function beginningOf(date: Date, extraArgs: DurationUnit[]): Date {
	const [unit = 'week'] = extraArgs;
	return DateTime.fromJSDate(date).startOf(unit).toJSDate();
}

function endOfMonth(date: Date): Date {
	return DateTime.fromJSDate(date).endOf('month').toJSDate();
}

function extract(date: Date, extraArgs: DatePart[]): number | Date {
	const [part] = extraArgs;
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

function format(date: Date, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts] = extraArgs as [string, LocaleOptions];
	return DateTime.fromJSDate(date).toFormat(dateFormat, { ...localeOpts });
}

function isBetween(date: Date, extraArgs: unknown[]): boolean {
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

function isInLast(date: Date, extraArgs: unknown[]): boolean {
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

	const dateInThePast = DateTime.now().minus(generateDurationObject(durationValue, unit));
	const thisDate = DateTime.fromJSDate(date);
	return dateInThePast <= thisDate && thisDate <= DateTime.now();
}

function isWeekend(date: Date): boolean {
	enum DAYS {
		saturday = 6,
		sunday = 7,
	}
	return [DAYS.saturday, DAYS.sunday].includes(DateTime.fromJSDate(date).weekday);
}

function minus(date: Date, extraArgs: unknown[]): Date {
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

	return DateTime.fromJSDate(date).minus(generateDurationObject(durationValue, unit)).toJSDate();
}

function plus(date: Date, extraArgs: unknown[]): Date {
	const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

	return DateTime.fromJSDate(date).plus(generateDurationObject(durationValue, unit)).toJSDate();
}

function toLocaleString(date: Date, extraArgs: unknown[]): string {
	const [dateFormat, localeOpts] = extraArgs as [DateTimeFormatOptions, LocaleOptions];
	return DateTime.fromJSDate(date).toLocaleString(dateFormat, localeOpts);
}

function toTimeFromNow(date: Date): string {
	const diffObj = DateTime.fromJSDate(date).diffNow().toObject();

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

function timeTo(date: Date, extraArgs: unknown[]): Duration {
	const [diff = new Date().toISOString(), unit = 'seconds'] = extraArgs as [string, DurationUnit];
	const diffDate = new Date(diff);
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
