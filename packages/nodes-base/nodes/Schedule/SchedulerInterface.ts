import type { CronExpression } from 'n8n-workflow';

export type IRecurrenceRule =
	| { activated: false; ruleName?: string }
	| {
			activated: true;
			index: number;
			intervalSize: number;
			typeInterval: 'hours' | 'days' | 'weeks' | 'months';
			ruleName?: string;
	  };

export type ScheduleInterval =
	| {
			field: 'cronExpression';
			ruleName?: string;
			expression: CronExpression;
	  }
	| {
			field: 'seconds';
			ruleName?: string;
			secondsInterval: number;
	  }
	| {
			field: 'minutes';
			ruleName?: string;
			minutesInterval: number;
	  }
	| {
			field: 'hours';
			ruleName?: string;
			hoursInterval: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'days';
			ruleName?: string;
			daysInterval: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'weeks';
			ruleName?: string;
			weeksInterval: number;
			triggerAtDay: number[];
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'months';
			ruleName?: string;
			monthsInterval: number;
			triggerAtDayOfMonth?: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  };

export interface Rule {
	interval: ScheduleInterval[];
}
