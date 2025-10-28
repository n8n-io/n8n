import type { Moment, Duration } from 'moment-timezone';

export class CronTimeIrregular {
	readonly interval: Duration;
	private readonly start: Moment;
	private nextExecution!: Moment;

	constructor(start: Moment, interval: Duration) {
		this.start = start;
		this.interval = interval;
		this.updateNextExecution();
	}

	updateNextExecution() {
		if (this.nextExecution) {
			this.nextExecution = this.nextExecution.add(this.interval);
		} else {
			this.nextExecution = this.start.clone().add(this.interval);
		}
	}

	getNextExecution(): Date {
		return this.nextExecution.toDate();
	}
}
