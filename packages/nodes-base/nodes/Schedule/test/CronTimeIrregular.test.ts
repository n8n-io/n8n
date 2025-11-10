import moment from 'moment-timezone';
import { CronTimeIrregular } from '../helpers/CronTimeIrregular';

describe('CronTimeIrregular', () => {
	let mockInterval: moment.Duration;
	const mockDate = new Date('2024-01-01T10:00:00Z');

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);
		mockInterval = moment.duration(1, 'hour');
	});

	describe('constructor', () => {
		it('should initialize with start time and interval', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);

			expect(cronTimeIrregular.interval).toEqual(mockInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});

		it('should handle different interval types', () => {
			const minuteInterval = moment.duration(15, 'minutes');
			const cronTimeIrregular = new CronTimeIrregular(minuteInterval);

			expect(cronTimeIrregular.interval).toEqual(minuteInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T10:15:00Z').toDate());
		});

		it('should handle day intervals', () => {
			const dayInterval = moment.duration(2, 'days');
			const cronTimeIrregular = new CronTimeIrregular(dayInterval);

			expect(cronTimeIrregular.interval).toEqual(dayInterval);
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-03T10:00:00Z').toDate());
		});
	});

	describe('updateNextExecution', () => {
		it('should update next execution by adding interval', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);

			// First execution should be start + interval
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());

			// Update to next execution
			jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T12:00:00Z').toDate());

			// Update again
			jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T13:00:00Z').toDate());
		});

		it('should work with different intervals', () => {
			const minuteInterval = moment.duration(30, 'minutes');
			const cronTimeIrregular = new CronTimeIrregular(minuteInterval);

			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T10:30:00Z').toDate());
			jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});
	});

	describe('getNextExecution', () => {
		it('should return Date object', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toBeInstanceOf(Date);
		});

		it('should return correct initial execution time', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});

		it('should return updated execution time after updateNextExecution', () => {
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);

			cronTimeIrregular.updateNextExecution();
			const nextExecution = cronTimeIrregular.getNextExecution();

			expect(nextExecution).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});
	});

	describe('edge cases', () => {
		it('should handle zero interval', () => {
			const zeroInterval = moment.duration(0);
			const cronTimeIrregular = new CronTimeIrregular(zeroInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(mockDate);

			cronTimeIrregular.updateNextExecution();
			expect(cronTimeIrregular.getNextExecution()).toEqual(mockDate);
		});

		it('should handle very small intervals', () => {
			const smallInterval = moment.duration(1, 'second');
			const cronTimeIrregular = new CronTimeIrregular(smallInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2024-01-01T10:00:01Z').toDate());
		});

		it('should handle large intervals', () => {
			const largeInterval = moment.duration(1, 'year');
			const cronTimeIrregular = new CronTimeIrregular(largeInterval);

			expect(cronTimeIrregular.getNextExecution()).toEqual(moment('2025-01-01T10:00:00Z').toDate());
		});
	});

	describe('immutability', () => {
		it('should not modify the original interval', () => {
			const originalInterval = mockInterval.clone();
			const cronTimeIrregular = new CronTimeIrregular(mockInterval);

			cronTimeIrregular.updateNextExecution();

			expect(cronTimeIrregular.interval.asMilliseconds()).toBe(originalInterval.asMilliseconds());
		});
	});
});
