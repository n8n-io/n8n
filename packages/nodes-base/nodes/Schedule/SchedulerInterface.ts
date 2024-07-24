import type { CronExpression } from 'n8n-workflow';

export type IRecurrenceRule =
	| { activated: false }
	| {
			activated: true;
			index: number;
			intervalSize: number;
			typeInterval: 'hours' | 'days' | 'weeks' | 'months';
	  };

export type ScheduleInterval =
	| {
			field: 'cronExpression';
			expression: CronExpression;
	  }
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
			triggerAtMinute?: number;
	  }
	| {
			field: 'days';
			daysInterval: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'weeks';
			weeksInterval: number;
			triggerAtDay: number[];
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'months';
			monthsInterval: number;
			triggerAtDayOfMonth?: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  };

export interface Rule {
	interval: ScheduleInterval[];
}
