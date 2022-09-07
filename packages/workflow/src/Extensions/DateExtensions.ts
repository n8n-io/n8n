/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { DateTime, DurationObjectUnits } from 'luxon';
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

type DurationUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

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
			) => boolean | string | Date | number
		>([
			['isDst', this.isDst],
			['isInLast', this.isInLast],
			['plus', this.plus],
		]);
	}

	private generateDurationObject(
		value: number,
		unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
	) {
		const durationObject = {} as DurationObjectUnits;

		if (unit === 'minute') {
			durationObject.minutes = value;
		} else if (unit === 'hour') {
			durationObject.hours = value;
		} else if (unit === 'day') {
			durationObject.days = value;
		} else if (unit === 'week') {
			durationObject.weeks = value;
		} else if (unit === 'month') {
			durationObject.months = value;
		} else if (unit === 'year') {
			durationObject.years = value;
		}
		return durationObject;
	}

	begginingOf(): boolean {
		return false;
	}

	endOfMonth(): boolean {
		return false;
	}

	extract(): string {
		return '';
	}

	format(): string {
		return '';
	}

	isBetween(value: string, extraArgs?: any): boolean {
		const comparisonDate = new Date(value);
		const [firstDate, secondDate] = extraArgs as Date[];

		if (firstDate > secondDate) {
			return secondDate < comparisonDate && comparisonDate < firstDate;
		}
		return secondDate > comparisonDate && comparisonDate > firstDate;
	}

	isDst(value: string): boolean {
		return DateTime.fromJSDate(new Date(value)).isInDST;
	}

	isInLast(value: string, extraArgs?: any): boolean {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		const dateInThePast = DateTime.now().minus(this.generateDurationObject(durationValue, unit));
		const thisDate = DateTime.fromJSDate(new Date(value));
		return dateInThePast <= thisDate && thisDate <= DateTime.now();
	}

	isWeekend(): boolean {
		return false;
	}

	minus(value: string, extraArgs?: any): Date {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(new Date(value))
			.minus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	plus(value: string, extraArgs?: any): Date {
		const [durationValue = 0, unit = 'minute'] = extraArgs as [number, DurationUnit];

		return DateTime.fromJSDate(new Date(value))
			.plus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}

	toLocaleString(): string {
		return '';
	}

	toTimeFromNow(): Date {
		return new Date();
	}

	timeTo(): number {
		return 1;
	}
}
