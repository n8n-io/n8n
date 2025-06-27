import type { CronExpression, ScheduleInterval } from './types';
import { UserError } from '../errors';

const DAY_MAPPING = {
	SUN: '0',
	MON: '1',
	TUE: '2',
	WED: '3',
	THU: '4',
	FRI: '5',
	SAT: '6',
};

const MAX_VALUES = {
	second: 60,
	minute: 60,
	hour: 24,
	dayOfWeek: 7,
	dayOfMonth: 31,
} as const;

class InvalidCronExpressionError extends UserError {
	constructor() {
		super('Invalid or unsupported cron expression');
	}
}

const splitCronExpression = (expression: CronExpression) => {
	const parts = expression.trim().split(/\s+/);

	// Standard cron has 5 parts (minute, hour, day of month, month, day of week)
	// but we also seem to support 6 parts (second, minute, hour, day of month, month, day of week)
	let second, minute, hour, dayOfMonth, month, dayOfWeek;

	if (parts.length === 5) {
		// Standard cron - no seconds field
		[minute, hour, dayOfMonth, month, dayOfWeek] = parts;
		second = '0';
	} else if (parts.length === 6) {
		[second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
	} else {
		throw new InvalidCronExpressionError();
	}

	dayOfMonth = dayOfMonth === '?' ? '*' : dayOfMonth;

	return [second, minute, hour, dayOfMonth, month, dayOfWeek];
};

/** This parses various sections into concrete values */
const parseTimeField = (value: string, fieldType: keyof typeof MAX_VALUES): number[] => {
	if (
		value === '*' ||
		(value === '?' && (fieldType === 'dayOfWeek' || fieldType === 'dayOfMonth'))
	) {
		return [];
	}

	const parseRange = (segment: string) => {
		const maxValue = MAX_VALUES[fieldType];
		const parts = segment.split('/');

		let step = 1,
			start = 0,
			end: number = maxValue - 1;
		if (segment.startsWith('*/')) {
			step = parseInt(segment.substring(2), 10);
		} else if (segment.includes('-')) {
			step = parts.length === 2 ? parseInt(parts[1], 10) : 1;
			[start, end] = parts[0].split('-').map((v) => parseInt(v, 10));
		}

		if (isNaN(step) || step > maxValue || end > maxValue) throw new InvalidCronExpressionError();

		if (segment.startsWith('*/') || segment.includes('-')) {
			const values = [];
			for (let i = start; i <= end; i += step) {
				values.push(i);
			}
			return values;
		}

		const val = parseInt(segment, 10);
		if (isNaN(val) || val > maxValue) throw new InvalidCronExpressionError();
		return [val];
	};

	return value.split(',').flatMap((v) => parseRange(v));
};

const isWildcard = (...fields: string[]): boolean =>
	fields.every((field) => field === '*' || field === '?');

// eslint-disable-next-line complexity
export const parseCronExpression = (expression: CronExpression): ScheduleInterval => {
	const [second, minute, hour, dayOfMonth, month, dayOfWeek] = splitCronExpression(expression);

	// Check for seconds-based schedules
	if (second === '*') {
		return { field: 'seconds', secondsInterval: 1 };
	}

	if (second.startsWith('*/') && isWildcard(minute, hour, dayOfMonth, month)) {
		const secondsInterval = parseInt(second.substring(2), 10);
		return { field: 'seconds', secondsInterval };
	}

	// Check for minute-based schedules
	if (isWildcard(hour, dayOfMonth, month)) {
		if (minute === '*') {
			return { field: 'minutes', minutesInterval: 1 };
		}

		if (minute.startsWith('*/')) {
			const minutesInterval = parseInt(minute.substring(2), 10);
			return { field: 'minutes', minutesInterval };
		}
	}

	const triggerAtMinute = parseTimeField(minute, 'minute');
	if (isWildcard(dayOfMonth, month) && (dayOfWeek === '*' || dayOfWeek === '?')) {
		if (hour === '*') {
			return { field: 'hours', hoursInterval: 1, triggerAtMinute };
		}

		if (hour.startsWith('*/')) {
			const hoursInterval = parseInt(hour.substring(2), 10);
			return { field: 'hours', hoursInterval, triggerAtMinute };
		}
	}

	const triggerAtHour = parseTimeField(hour, 'hour');
	// Yearly pattern: S M H 1 1 *
	if (dayOfMonth === '1' && month === '1') {
		return {
			field: 'months',
			monthsInterval: 12,
			triggerAtDayOfMonth: [1],
			triggerAtHour,
			triggerAtMinute,
		};
	}

	// Daily pattern
	if (isWildcard(dayOfMonth, month) && (dayOfWeek === '*' || dayOfWeek === '?')) {
		return { field: 'days', daysInterval: 1, triggerAtHour, triggerAtMinute };
	}

	// Weekly pattern
	if (isWildcard(dayOfMonth, month) && dayOfWeek !== '*' && dayOfWeek !== '?') {
		let parsedDayOfWeek = dayOfWeek;
		// Replace day names with their numeric values
		Object.entries(DAY_MAPPING).forEach(([name, value]) => {
			parsedDayOfWeek = parsedDayOfWeek.replace(name, value);
		});

		const triggerAtDayOfWeek = parseTimeField(parsedDayOfWeek, 'dayOfWeek');
		return {
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDayOfWeek,
			triggerAtHour,
			triggerAtMinute,
		};
	}

	const triggerAtDayOfMonth = parseTimeField(dayOfMonth, 'dayOfMonth');
	// Monthly patterns
	if (month.startsWith('*/')) {
		const monthsInterval = parseInt(month.substring(2), 10);
		return {
			field: 'months',
			monthsInterval,
			triggerAtDayOfMonth,
			triggerAtHour,
			triggerAtMinute,
		};
	}

	if (month.match(/^\d+$/) ?? month === '*') {
		return {
			field: 'months',
			monthsInterval: 1,
			triggerAtDayOfMonth,
			triggerAtHour,
			triggerAtMinute,
		};
	}

	throw new InvalidCronExpressionError();
};
