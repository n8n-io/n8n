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
					return method.call('', mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<string, (value: string) => string | Date>([]);
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

	isDst(value: string): boolean {
		return DateTime.fromJSDate(new Date(value)).isInDST;
	}

	isInLast(value: string, extraArgs = [0, 'minute']): boolean {
		const durationValue = extraArgs[0] as number;
		const unit = extraArgs[1] as DurationUnit;

		const dateInThePast = DateTime.now().minus(this.generateDurationObject(durationValue, unit));
		const thisDate = DateTime.fromJSDate(new Date(value));
		return dateInThePast <= thisDate && thisDate <= DateTime.now();
	}

	plus(value: string, extraArgs = [0, 'minute']): Date {
		const durationValue: number = extraArgs[0] as number;
		const unit = extraArgs[1] as DurationUnit;
		return DateTime.fromJSDate(new Date(value))
			.plus(this.generateDurationObject(durationValue, unit))
			.toJSDate();
	}
}
