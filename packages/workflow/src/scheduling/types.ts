type CronDigit = number;
type CronWildcard = '*' | '?';
type CronStep = `*/${number}` | `${number}-${number}/${number}`;
type CronRange = `${CronDigit}-${CronDigit}`;
type CronList =
	| `${CronDigit},${CronDigit}`
	| `${CronRange},${CronDigit}`
	| `${CronRange},${CronRange}`;
type CronValue = CronDigit | CronWildcard | CronStep | CronRange | CronList;

// Special characters
type CronDayOfWeekSpecial = `${CronDigit}#${CronDigit}` | `${CronDigit}L`;
type CronDayOfMonthSpecial = 'L' | `L-${CronDigit}` | `${CronDigit}W`;

// Day names for day of week
type CronDayName = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
type CronDayNameRange = `${CronDayName}-${CronDayName}`;
// @ts-expect-error circular reference
type CronDayNameList = `${CronDayName},${CronDayName}` | `${CronDayName},${CronDayNameList}`;
type CronDayOfWeekValue =
	| CronValue
	| CronDayOfWeekSpecial
	| CronDayName
	| CronDayNameRange
	| CronDayNameList;

// Month names
type CronMonthName =
	| 'JAN'
	| 'FEB'
	| 'MAR'
	| 'APR'
	| 'MAY'
	| 'JUN'
	| 'JUL'
	| 'AUG'
	| 'SEP'
	| 'OCT'
	| 'NOV'
	| 'DEC';
type CronMonthNameRange = `${CronMonthName}-${CronMonthName}`;
// @ts-expect-error circular reference
type CronMonthNameList =
	| `${CronMonthName},${CronMonthName}`
	| `${CronMonthName},${CronMonthNameList}`;
type CronMonthValue = CronValue | CronMonthName | CronMonthNameRange | CronMonthNameList;

// Day of month can have special characters
type CronDayOfMonthValue = CronValue | CronDayOfMonthSpecial;

// Common units (second, minute, hour)
type CronTimeUnit = CronValue;

export type CronExpression =
	| `${CronTimeUnit} ${CronTimeUnit} ${CronTimeUnit} ${CronDayOfMonthValue} ${CronMonthValue} ${CronDayOfWeekValue}`
	// 5-part standard cron (no seconds)
	| `${CronTimeUnit} ${CronTimeUnit} ${CronDayOfMonthValue} ${CronMonthValue} ${CronDayOfWeekValue}`;

interface BaseTriggerTime<T extends string> {
	mode: T;
}

interface CustomTrigger extends BaseTriggerTime<'custom'> {
	cronExpression: CronExpression;
}

interface EveryX<U extends string> extends BaseTriggerTime<'everyX'> {
	unit: U;
	value: number;
}

type EveryMinute = BaseTriggerTime<'everyMinute'>;
type EveryXMinutes = EveryX<'minutes'>;

interface EveryHour extends BaseTriggerTime<'everyHour'> {
	minute: number; // 0 - 59
}
type EveryXHours = EveryX<'hours'>;

interface EveryDay extends BaseTriggerTime<'everyDay'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
}

interface EveryWeek extends BaseTriggerTime<'everyWeek'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	weekday: number; // 0 - 6(Sun - Sat)
}

interface EveryMonth extends BaseTriggerTime<'everyMonth'> {
	hour: number; // 0 - 23
	minute: number; // 0 - 59
	dayOfMonth: number; // 1 - 31
}

/** @deprecated */
export type TriggerTime =
	| CustomTrigger
	| EveryMinute
	| EveryXMinutes
	| EveryHour
	| EveryXHours
	| EveryDay
	| EveryWeek
	| EveryMonth;

export type ScheduleInterval =
	| {
			field: 'seconds';
			secondsInterval: number;
	  }
	| {
			field: 'minutes';
			minutesInterval: number;
	  }
	| {
			field: 'hours';
			hoursInterval: number;
			triggerAtMinute: number[];
	  }
	| {
			field: 'days';
			daysInterval: number;
			triggerAtHour: number[];
			triggerAtMinute: number[];
	  }
	| {
			field: 'weeks';
			weeksInterval: number;
			triggerAtDayOfWeek: number[];
			triggerAtHour: number[];
			triggerAtMinute: number[];
	  }
	| {
			field: 'months';
			monthsInterval: number;
			triggerAtDayOfMonth: number[];
			triggerAtHour: number[];
			triggerAtMinute: number[];
	  };
