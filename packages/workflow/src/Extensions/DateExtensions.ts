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

export class DateExtensions extends BaseExtension<string> {
	methodMapping = new Map<string, ExtensionMethodHandler<string>>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: string, extraArgs?: number[] | string[] | boolean[] | undefined) {
		return Array.from(this.methodMapping).reduce((p, c) => {
			const [key, method] = c;
			Object.assign(p, {
				[key]: () => {
					return method.call(this, mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<
			string,
			(
				value: string,
				extraArgs?: string | number[] | string[] | boolean[] | undefined,
			) => string | Date | boolean | number | Duration
		>([
			['begginingOf', this.begginingOf],
			['endOfMonth', this.endOfMonth],
			['extract', this.extract],
			['format', this.format],
			['isBetween', this.isBetween],
			['isDst', this.isDst],
			['isInLast', this.isInLast],
			['isWeekend', this.isWeekend],
			['minus', this.minus],
			['plus', this.plus],
			['toLocaleString', this.toLocaleString],
			['toTimeFromNow', this.toTimeFromNow],
			['timeTo', this.timeTo],
		]);
	}

	private generateDurationObject(durationValue: number, unit: DurationUnit) {
		return { [`${unit}s`]: durationValue } as DurationObjectUnits;
	}

	begginingOf(value: string, extraArgs?: any): Date {
		const date = new Date(value);
		const [unit] = extraArgs as DurationUnit[];
		return DateTime.fromJSDate(date).startOf(unit).toJSDate();
	}

	endOfMonth(value: string): Date {
		const date = new Date(value);
		return DateTime.fromJSDate(date).endOf('month').toJSDate();
	}

	extract(value: string, extraArgs?: any): number | Date {
		const date = new Date(value);
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

	format(value: string, extraArgs: any): string {
		const date = new Date(value);
		const [format, localeOpts] = extraArgs as [string, LocaleOptions];
		return DateTime.fromJSDate(date).toFormat(format, { ...localeOpts });
	}

	isBetween(value: string, extraArgs?: any): boolean {
		const date = new Date(value);
		const [first, second] = extraArgs as string[];
		const firstDate = new Date(first);
		const secondDate = new Date(second);

		if (firstDate > secondDate) {
			return secondDate < date && date < firstDate;
		}
		return secondDate > date && date > firstDate;
	}

	isDst(value: string): boolean {
		const date = new Date(value);
		return DateTime.fromJSDate(date).isInDST;
	}

	isInLast(value: string, extraArgs?: any): boolean {
		const date = new Date(value);
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		const dateInThePast = DateTime.now().minus(this.generateDurationObject(durationValue, unit));
		const thisDate = DateTime.fromJSDate(date);
		return dateInThePast <= thisDate && thisDate <= DateTime.now();
	}

	isWeekend(value: string): boolean {
		enum DAYS {
			saturday = 6,
			sunday = 7,
		}
		const date = new Date(value);
		return [DAYS.saturday, DAYS.sunday].includes(DateTime.fromJSDate(date).weekday);
	}

	minus(value: string, extraArgs?: any): Date {
		const date = new Date(value);
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(date)
			.minus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	plus(value: string, extraArgs?: any): Date {
		const date = new Date(value);
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(date)
			.plus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	toLocaleString(value: string, extraArgs?: any): string {
		const date = new Date(value);
		const [format, localeOpts] = extraArgs as [DateTimeFormatOptions, LocaleOptions];
		return DateTime.fromJSDate(date).toLocaleString(format, localeOpts);
	}

	toTimeFromNow(value: string): string {
		const date = new Date(value);
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

	timeTo(value: string, extraArgs?: any): Duration {
		const date = new Date(value);
		const [diffDate, unit = 'seconds'] = extraArgs as [Date, DurationUnit];
		return DateTime.fromJSDate(date).diff(DateTime.fromJSDate(diffDate), unit);
	}
}
