import moment from 'moment-timezone';
import type { Duration, Moment } from 'moment-timezone';

export class CronTimeIrregular {
	readonly interval: Duration;
	private nextExecution!: Moment;

	constructor(interval: Duration) {
		this.interval = interval;
		this.updateNextExecution();
	}

	updateNextExecution() {
		const now = moment.tz();
		this.nextExecution = now.add(this.interval);
	}

	getNextExecution(): Date {
		return this.nextExecution.toDate();
	}
}
