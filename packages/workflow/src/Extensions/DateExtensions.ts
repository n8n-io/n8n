/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import {
	DateTime,
	DateTimeFormatOptions,
	Duration,
	DurationObjectUnits,
	LocaleOptions,
} from 'luxon';
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

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

export class DateExtensions extends BaseExtension<Date> {
	methodMapping = new Map<string, ExtensionMethodHandler<Date>>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: Date, extraArgs?: Date | Date[] | number[] | string[] | boolean[] | undefined) {
		return Array.from(this.methodMapping).reduce((p, c) => {
			const [key, method] = c;
			Object.assign(p, {
				[key]: () => {
					return method.call(Date, mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<
			string,
			(
				value: Date,
				extraArgs?: Date | Date[] | string | number[] | string[] | boolean[] | undefined,
			) => string | Date | boolean | number | Duration
		>([
			['begginingOf', this.begginingOf],
			['endOfMonth', this.endOfMonth],
			['extract', this.extract],
			['isBetween', this.isBetween],
			['isDst', this.isDst],
			['isInLast', this.isInLast],
			['isWeekend', this.isWeekend],
			['minus', this.minus],
			['plus', this.plus],
			['toTimeFromNow', this.toTimeFromNow],
			['timeTo', this.timeTo],
		]);
	}

	private generateDurationObject(durationValue: number, unit: DurationUnit) {
		return { [`${unit}s`]: durationValue } as DurationObjectUnits;
	}

	begginingOf(date: Date, extraArgs?: any): Date {
		const [unit = 'week'] = extraArgs as DurationUnit[];
		return DateTime.fromJSDate(date).startOf(unit).toJSDate();
	}

	endOfMonth(date: Date): Date {
		return DateTime.fromJSDate(date).endOf('month').toJSDate();
	}

	extract(date: Date, extraArgs?: any): number | Date {
		const [part] = extraArgs as DatePart[];
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

	format(date: Date, extraArgs: any): string {
		const [format, localeOpts] = extraArgs as [string, LocaleOptions];
		return DateTime.fromJSDate(date).toFormat(format, { ...localeOpts });
	}

	isBetween(date: Date, extraArgs?: any): boolean {
		const [first, second] = extraArgs as string[];
		const firstDate = new Date(first);
		const secondDate = new Date(second);

		if (firstDate > secondDate) {
			return secondDate < date && date < firstDate;
		}
		return secondDate > date && date > firstDate;
	}

	isDst(date: Date): boolean {
		return DateTime.fromJSDate(date).isInDST;
	}

	isInLast(date: Date, extraArgs?: any): boolean {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		const dateInThePast = DateTime.now().minus(this.generateDurationObject(durationValue, unit));
		const thisDate = DateTime.fromJSDate(date);
		return dateInThePast <= thisDate && thisDate <= DateTime.now();
	}

	isWeekend(date: Date): boolean {
		enum DAYS {
			saturday = 6,
			sunday = 7,
		}
		return [DAYS.saturday, DAYS.sunday].includes(DateTime.fromJSDate(date).weekday);
	}

	minus(date: Date, extraArgs?: any): Date {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(date)
			.minus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	plus(date: Date, extraArgs?: any): Date {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(date)
			.plus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	toLocaleString(date: Date, extraArgs?: any): string {
		const [format, localeOpts] = extraArgs as [DateTimeFormatOptions, LocaleOptions];
		return DateTime.fromJSDate(date).toLocaleString(format, localeOpts);
	}

	toTimeFromNow(date: Date): string {
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

	timeTo(date: Date, extraArgs?: any): Duration {
		const [diff = new Date().toISOString(), unit = 'seconds'] = extraArgs as [string, DurationUnit];
		const diffDate = new Date(diff);
		return DateTime.fromJSDate(date).diff(DateTime.fromJSDate(diffDate), unit);
	}
}
