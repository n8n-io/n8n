interface BaseTriggerTime<T extends string> {
	mode: T;
}

type CronExpression = string;
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

export type TriggerTime =
	| CustomTrigger
	| EveryMinute
	| EveryXMinutes
	| EveryHour
	| EveryXHours
	| EveryDay
	| EveryWeek
	| EveryMonth;

const randomSecond = () => Math.floor(Math.random() * 60).toString();

export const toCronExpression = (item: TriggerTime): CronExpression => {
	if (item.mode === 'everyMinute') return `${randomSecond()} * * * * *`;
	if (item.mode === 'everyHour') return `${randomSecond()} ${item.minute} * * * *`;

	if (item.mode === 'everyX') {
		if (item.unit === 'minutes') return `${randomSecond()} */${item.value} * * * *`;
		if (item.unit === 'hours') return `${randomSecond()} 0 */${item.value} * * *`;
	}
	if (item.mode === 'everyDay') return `${randomSecond()} ${item.minute} ${item.hour} * * *`;
	if (item.mode === 'everyWeek')
		return `${randomSecond()} ${item.minute} ${item.hour} * * ${item.weekday}`;

	if (item.mode === 'everyMonth')
		return `${randomSecond()} ${item.minute} ${item.hour} ${item.dayOfMonth} * *`;

	return item.cronExpression.trim();
};
