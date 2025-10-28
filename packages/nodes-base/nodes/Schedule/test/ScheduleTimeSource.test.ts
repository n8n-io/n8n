import moment from 'moment-timezone';

import { ScheduleTimeSource } from '../helpers/ScheduleTimeSource';

describe('ScheduleTimeSource', () => {
	it('should initialize with cron expression', () => {
		const cronExpression = '0 9 * * 1-5';
		const timeSource = new ScheduleTimeSource({
			type: 'cron',
			cronExpression,
		});

		expect(timeSource.type).toBe('cron');
		expect(timeSource.getTimeSource()).toBe(cronExpression);
	});

	describe('constructor with irregular type', () => {
		let mockStart: moment.Moment;
		let mockInterval: moment.Duration;

		beforeEach(() => {
			mockStart = moment('2024-01-01T10:00:00Z');
			mockInterval = moment.duration(2, 'hours');
		});

		it('should initialize with start time and interval', () => {
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: mockInterval,
			});

			expect(timeSource.type).toBe('irregular');
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T12:00:00Z').toDate());
		});

		it('should handle different interval types', () => {
			const minuteInterval = moment.duration(30, 'minutes');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: minuteInterval,
			});

			expect(timeSource.type).toBe('irregular');
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T10:30:00Z').toDate());
		});

		it('should handle day intervals', () => {
			const dayInterval = moment.duration(1, 'day');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: dayInterval,
			});

			expect(timeSource.type).toBe('irregular');
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-02T10:00:00Z').toDate());
		});
	});

	describe('getTimeSource', () => {
		it('should return cron expression for cron type', () => {
			const cronExpression = '0 12 * * *';
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression,
			});

			expect(timeSource.getTimeSource()).toBe(cronExpression);
		});

		it('should return Date object for irregular type', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const mockInterval = moment.duration(1, 'hour');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: mockInterval,
			});

			const result = timeSource.getTimeSource();
			expect(result).toBeInstanceOf(Date);
			expect(result).toEqual(moment('2024-01-01T11:00:00Z').toDate());
		});

		it('should throw error for invalid state', () => {
			// This is a theoretical test since the constructor ensures valid state
			// But we can test the error handling in the method
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression: '0 12 * * *',
			});

			// Mock the internal state to simulate invalid condition
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const timeSourceWithMockedState = timeSource as any;
			timeSourceWithMockedState.cronExpression = null;
			timeSourceWithMockedState.cronTimeIrregular = null;

			expect(() => timeSource.getTimeSource()).toThrow('No time source defined');
		});
	});

	describe('updateTimeSource', () => {
		it('should update irregular time source', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const mockInterval = moment.duration(1, 'hour');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: mockInterval,
			});

			// Initial execution
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T11:00:00Z').toDate());

			// Update and check next execution
			timeSource.updateTimeSource();
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T12:00:00Z').toDate());

			// Update again
			timeSource.updateTimeSource();
			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T13:00:00Z').toDate());
		});

		it('should not affect cron type time source', () => {
			const cronExpression = '0 12 * * *';
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression,
			});

			const initialValue = timeSource.getTimeSource();
			timeSource.updateTimeSource();
			const afterUpdateValue = timeSource.getTimeSource();

			expect(initialValue).toBe(afterUpdateValue);
			expect(afterUpdateValue).toBe(cronExpression);
		});
	});

	describe('toString', () => {
		it('should return cron expression for cron type', () => {
			const cronExpression = '0 9 * * 1-5';
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression,
			});

			expect(timeSource.toString()).toBe(cronExpression);
		});

		it('should return humanized interval for irregular type', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const mockInterval = moment.duration(2, 'hours');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: mockInterval,
			});

			const result = timeSource.toString();
			expect(result).toContain('Irregular interval:');
			expect(result).toContain('2 hours');
		});

		it('should handle different interval durations in toString', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const minuteInterval = moment.duration(15, 'minutes');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: minuteInterval,
			});

			const result = timeSource.toString();
			expect(result).toContain('Irregular interval:');
			expect(result).toContain('15 minutes');
		});

		it('should return unknown interval for invalid state', () => {
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression: '0 12 * * *',
			});

			// Mock invalid state
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const timeSourceWithMockedState = timeSource as any;
			timeSourceWithMockedState.cronExpression = null;
			timeSourceWithMockedState.cronTimeIrregular = null;

			expect(timeSource.toString()).toBe('Unknown interval');
		});
	});

	describe('edge cases', () => {
		it('should handle empty cron expression', () => {
			const timeSource = new ScheduleTimeSource({
				type: 'cron',
				cronExpression: '',
			});

			// Empty string is falsy, so it will throw an error
			expect(() => timeSource.getTimeSource()).toThrow('No time source defined');
		});

		it('should handle zero interval for irregular type', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const zeroInterval = moment.duration(0);
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: zeroInterval,
			});

			expect(timeSource.getTimeSource()).toEqual(mockStart.toDate());
		});

		it('should handle very small intervals', () => {
			const mockStart = moment('2024-01-01T10:00:00Z');
			const smallInterval = moment.duration(1, 'second');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: mockStart,
				interval: smallInterval,
			});

			expect(timeSource.getTimeSource()).toEqual(moment('2024-01-01T10:00:01Z').toDate());
		});

		it('should handle different timezones', () => {
			const startWithTimezone = moment.tz('2024-01-01T10:00:00', 'America/New_York');
			const interval = moment.duration(1, 'hour');
			const timeSource = new ScheduleTimeSource({
				type: 'irregular',
				start: startWithTimezone,
				interval,
			});

			expect(timeSource.getTimeSource()).toEqual(
				moment.tz('2024-01-01T11:00:00', 'America/New_York').toDate(),
			);
		});
	});
});
