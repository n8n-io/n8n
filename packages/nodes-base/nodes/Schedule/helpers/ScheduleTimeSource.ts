import moment from 'moment-timezone';
import type { Duration } from 'moment-timezone';
import type { ITimeSource } from 'n8n-workflow';

import { CronTimeIrregular } from './CronTimeIrregular';

type TimeSourceConstructorParams =
	| {
			type: 'cron';
			cronExpression: string;
	  }
	| {
			type: 'irregular';
			interval: Duration;
	  };

export class ScheduleTimeSource implements ITimeSource {
	private readonly cronExpression: string | null = null;
	private readonly cronTimeIrregular: CronTimeIrregular | null = null;
	readonly type: 'cron' | 'irregular';

	constructor(params: TimeSourceConstructorParams) {
		this.type = params.type;
		if (params.type === 'cron') {
			this.cronExpression = params.cronExpression;
		} else if (params.type === 'irregular') {
			this.cronTimeIrregular = new CronTimeIrregular(params.interval);
		}
	}

	getTimeSource() {
		if (this.cronExpression) {
			return this.cronExpression;
		} else if (this.cronTimeIrregular) {
			const nextExecution = this.cronTimeIrregular.getNextExecution();
			const isInPast = moment.tz().isAfter(nextExecution);
			if (isInPast) {
				this.cronTimeIrregular.updateNextExecution();
			}
			return this.cronTimeIrregular.getNextExecution();
		}
		throw new Error('No time source defined');
	}

	updateTimeSource() {
		if (this.cronTimeIrregular) {
			this.cronTimeIrregular.updateNextExecution();
		}
	}

	toString() {
		if (this.cronExpression) {
			return this.cronExpression;
		} else if (this.cronTimeIrregular) {
			return `Irregular interval: ${this.cronTimeIrregular.interval.toISOString()} `;
		}
		return 'Unknown interval';
	}
}
