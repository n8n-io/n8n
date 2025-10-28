import moment from 'moment-timezone';
import { CronTimeIrregular } from '../helpers/CronTimeIrregular';

describe('CronTimeIrregular', () => {
	let mockStart: moment.Moment;
	let mockInterval: moment.Duration;

	beforeEach(() => {
		mockStart = moment('2024-01-01T10:00:00Z');
		mockInterval = moment.duration(1, 'hour');
	});

	describe('constructor', () => {
		it('should initialize with start time and interval', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);

			expect(cronTimeIrregular.interval).toEqual(mockInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});

		it('should handle different interval types', () => {
			const minuteInterval = moment.duration(15, 'minutes');
			const cronTimeIrregular = new CronTimeIrregular(mockStart, minuteInterval);

			expect(cronTimeIrregular.interval).toEqual(minuteInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T10:15:00Z').toDate());
		});

		it('should handle day intervals', () => {
			const dayInterval = moment.duration(2, 'days');
			const cronTimeIrregular = new CronTimeIrregular(mockStart, dayInterval);

			expect(cronTimeIrregular.interval).toEqual(dayInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-03T10:00:00Z').toDate());
		});
	});

	describe('updateNextExecution', () => {
		it('should update next execution by adding interval', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);

			// First execution should be start + interval
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());

			// Update to next execution
			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T12:00:00Z').toDate());

			// Update again
			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T13:00:00Z').toDate());
		});

		it('should work with different intervals', () => {
			const minuteInterval = moment.duration(30, 'minutes');
			const cronTimeIrregular = new CronTimeIrregular(mockStart, minuteInterval);

			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());

			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:30:00Z').toDate());
		});
	});

	describe('getNextExecution', () => {
		it('should return Date object', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toBeInstanceOf(Date);
		});

		it('should return correct initial execution time', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});

		it('should return updated execution time after updateNextExecution', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);

			cronTimeIrregular.updateNextExecution();
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toEqual(moment('2024-01-01T12:00:00Z').toDate());
		});
	});

	describe('edge cases', () => {
		it('should handle zero interval', () => {
			const zeroInterval = moment.duration(0);
			const cronTimeIrregular = new CronTimeIrregular(mockStart, zeroInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(mockStart.toDate());

			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(mockStart.toDate());
		});

		it('should handle very small intervals', () => {
			const smallInterval = moment.duration(1, 'second');
			const cronTimeIrregular = new CronTimeIrregular(mockStart, smallInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T10:00:01Z').toDate());
		});

		it('should handle large intervals', () => {
			const largeInterval = moment.duration(1, 'year');
			const cronTimeIrregular = new CronTimeIrregular(mockStart, largeInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2025-01-01T10:00:00Z').toDate());
		});

		it('should handle different timezones', () => {
			const startWithTimezone = moment.tz('2024-01-01T10:00:00', 'America/New_York');
			const cronTimeIrregular = new CronTimeIrregular(startWithTimezone, mockInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(
				moment.tz('2024-01-01T11:00:00', 'America/New_York').toDate(),
			);
		});
	});

	describe('immutability', () => {
		it('should not modify the original start time', () => {
			const originalStart = mockStart.clone();
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);

			cronTimeIrregular.updateNextExecution();
			cronTimeIrregular.updateNextExecution();

			expect(mockStart.isSame(originalStart)).toBe(true);
		});

		it('should not modify the original interval', () => {
			const originalInterval = mockInterval.clone();
			const cronTimeIrregular = new CronTimeIrregular(mockStart, mockInterval);

			cronTimeIrregular.updateNextExecution();

			expect(cronTimeIrregular.interval.asMilliseconds()).toBe(originalInterval.asMilliseconds());
		});
	});
});
